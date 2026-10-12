"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  calculateHealthRelief2026,
  calculateRentCredit2026,
  calculateTuitionRelief2026,
  calculatePensionRelief2026,
} from "@/lib/domain/tax/credits";
import { getProfile } from "@/lib/supabase/employment";
import {
  addCreditClaim,
  deleteCreditClaim,
  listCreditClaims,
  type CreditClaim,
} from "@/lib/supabase/credits";
import { requireUser } from "@/lib/supabase/server";
import { normalizeDecimal } from "@/lib/validation/money";
import { ZERO } from "@/lib/utils/decimal";

const amount = normalizeDecimal().refine(
  (value) => !value.startsWith("-"),
  "Amount must be zero or greater",
);
const schema = z.object({
  type: z.enum([
    "RENT_TAX_CREDIT",
    "HEALTH_EXPENSE_RELIEF",
    "TUITION_FEE_RELIEF",
    "PENSION_RELIEF",
    "FLAT_RATE_EXPENSE",
  ]),
  inputAmount: amount,
  secondaryAmount: amount,
  evidenceNote: z.string().trim().max(500),
});

function fail(message: string): never {
  redirect(`/credits?error=${encodeURIComponent(message)}`);
}

export async function addClaim(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    type: formData.get("type"),
    inputAmount: formData.get("inputAmount"),
    secondaryAmount: formData.get("secondaryAmount") || "0",
    evidenceNote: formData.get("evidenceNote") || "",
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check the claim details");
  const { supabase, userId } = await requireUser();
  const { type, inputAmount, secondaryAmount, evidenceNote } = parsed.data;
  const [profile, existingClaims] = await Promise.all([
    getProfile(supabase, userId, 2026),
    listCreditClaims(supabase, userId, 2026),
  ]);
  if (
    (type === "RENT_TAX_CREDIT" || type === "TUITION_FEE_RELIEF") &&
    existingClaims.some((claim) => claim.type === type)
  ) {
    fail("Remove the existing annual rent or tuition claim before replacing it");
  }
  const confirmed = (name: string) => formData.has(name);
  let result = {
    eligibleAmount: inputAmount,
    estimatedTaxValue: ZERO,
    requiresReview: true,
    explanation: "Review with Revenue before claiming.",
  };
  if (type === "RENT_TAX_CREDIT") {
    const calculated = calculateRentCredit2026({
      rentPaid: inputAmount,
      utilitiesAndServices: secondaryAmount,
      eligibleUseConfirmed: confirmed("eligibleUse"),
      unrelatedLandlordConfirmed: confirmed("unrelatedLandlord"),
      tenancyConfirmed: confirmed("tenancy"),
    });
    result = {
      ...calculated,
      requiresReview: calculated.requiresReview || !confirmed("noHousingSupport"),
      estimatedTaxValue: confirmed("noHousingSupport") ? calculated.estimatedTaxValue : ZERO,
    };
  } else if (type === "HEALTH_EXPENSE_RELIEF") {
    result = calculateHealthRelief2026(
      inputAmount,
      secondaryAmount,
      confirmed("qualifyingExpense"),
    );
  } else if (type === "TUITION_FEE_RELIEF") {
    result = calculateTuitionRelief2026({
      qualifyingFees: inputAmount,
      fullTimeApprovedCourseConfirmed: confirmed("approvedFullTime") && confirmed("feesPaidByMe"),
    });
  } else if (type === "PENSION_RELIEF") {
    if (profile?.dateOfBirth) {
      const age = 2026 - Number(profile.dateOfBirth.slice(0, 4));
      result = calculatePensionRelief2026({
        age,
        relevantEarnings: secondaryAmount,
        employeeContribution: inputAmount,
        alreadyRelievedThroughPayroll: confirmed("alreadyRelieved"),
      });
    }
  }
  const status: CreditClaim["status"] = confirmed("alreadyClaimed")
    ? "ALREADY_CLAIMED"
    : result.requiresReview ||
        profile?.calculationStatus !== "SUPPORTED" ||
        type === "PENSION_RELIEF" ||
        type === "FLAT_RATE_EXPENSE"
      ? "POTENTIALLY_ELIGIBLE"
      : "USER_CONFIRMED";
  await addCreditClaim(supabase, userId, {
    taxYear: 2026,
    type,
    inputAmount,
    eligibleAmount: result.eligibleAmount,
    estimatedTaxValue: result.estimatedTaxValue,
    status,
    evidenceNote: evidenceNote || null,
    details: {
      secondaryAmount,
      explanation: result.explanation,
      confirmations: {
        eligibleUse: confirmed("eligibleUse"),
        unrelatedLandlord: confirmed("unrelatedLandlord"),
        tenancy: confirmed("tenancy"),
        noHousingSupport: confirmed("noHousingSupport"),
        qualifyingExpense: confirmed("qualifyingExpense"),
        approvedFullTime: confirmed("approvedFullTime"),
        feesPaidByMe: confirmed("feesPaidByMe"),
        alreadyRelieved: confirmed("alreadyRelieved"),
      },
    },
  });
  revalidatePath("/credits");
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect("/credits?saved=1");
}

export async function removeClaim(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || !z.uuid().safeParse(id).success) fail("Claim was not found");
  const { supabase, userId } = await requireUser();
  await deleteCreditClaim(supabase, userId, id);
  revalidatePath("/credits");
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect("/credits");
}
