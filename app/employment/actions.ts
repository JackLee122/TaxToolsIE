"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  deleteEmployment,
  getEmployment,
  getProfile,
  saveProfile,
  saveEmployment as saveStoredEmployment,
} from "@/lib/supabase/employment";
import { employmentFormSchema } from "@/lib/domain/employment/validation";
import { requireUser } from "@/lib/supabase/server";

const TAX_YEAR = 2026;

function fail(message: string): never {
  redirect(`/employment?error=${encodeURIComponent(message)}`);
}

function formFields(formData: FormData) {
  return Object.fromEntries(
    [
      "employerName",
      "employerRegistrationNumber",
      "startDate",
      "endDate",
      "grossPay",
      "payForIncomeTax",
      "payForUsc",
      "incomeTaxDeducted",
      "uscDeducted",
      "prsiDeducted",
      "pensionContributionsPayrollRelieved",
      "otherDeductionAmount",
    ].map((field) => [field, formData.get(field) ?? ""]),
  );
}

function revalidateEmploymentPages() {
  revalidatePath("/employment");
  revalidatePath("/dashboard");
}

const profileSchema = z.object({
  residenceStatus: z.enum(["IRISH_RESIDENT", "OTHER"]),
  domicileStatus: z.enum(["IRISH_DOMICILED", "OTHER"]),
  assessmentStatus: z.enum(["SINGLE_INDIVIDUAL", "UNSUPPORTED"]),
});

export async function createProfile(formData: FormData): Promise<void> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("Answer the profile questions first");
  const { supabase, userId } = await requireUser();
  if (!(await getProfile(supabase, userId, TAX_YEAR))) {
    await saveProfile(supabase, userId, TAX_YEAR, {
      residenceStatus: parsed.data.residenceStatus,
      domicileStatus: parsed.data.domicileStatus,
      assessmentStatus: parsed.data.assessmentStatus,
      mainIncomePaye: formData.has("mainIncomePaye"),
      hasSelfEmployment: formData.has("hasSelfEmployment"),
      hasRentalIncome: formData.has("hasRentalIncome"),
      dateOfBirth: null,
      unemployedAtYearEnd: false,
      unemploymentStartDate: null,
      receivesTaxableSocialWelfare: false,
    });
  }
  revalidateEmploymentPages();
  redirect("/employment");
}

export async function saveEmployment(formData: FormData): Promise<void> {
  const parsed = employmentFormSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Enter valid employment details");

  const { supabase, userId } = await requireUser();
  const id = formData.get("id");
  const value = {
    taxYear: TAX_YEAR,
    ...parsed.data,
    source: "MANUAL" as const,
    sourceDocumentId: null,
    verifiedByUser: true,
  };
  if (typeof id === "string" && id !== "") {
    if (!(await getEmployment(supabase, userId, id))) fail("Employment record was not found");
    await saveStoredEmployment(supabase, userId, id, value);
  } else {
    if (!(await getProfile(supabase, userId, TAX_YEAR))) fail("Create your profile first");
    await saveStoredEmployment(supabase, userId, null, value);
  }
  revalidateEmploymentPages();
  redirect("/employment");
}

export async function removeEmployment(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") fail("Employment record was not found");
  const { supabase, userId } = await requireUser();
  if (!(await getEmployment(supabase, userId, id))) fail("Employment record was not found");
  await deleteEmployment(supabase, userId, id);
  revalidateEmploymentPages();
  redirect("/employment");
}
