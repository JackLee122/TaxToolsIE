"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addInvestmentEntry,
  updateInvestmentReview,
  deleteInvestmentEntry,
  getInvestmentEntry,
} from "@/lib/supabase/investments";
import { requireUser } from "@/lib/supabase/server";
import { normalizeDecimal } from "@/lib/validation/money";

const nonNegative = normalizeDecimal().refine(
  (value) => !value.startsWith("-"),
  "Amount must be zero or greater",
);
const optionalAmount = z.union([z.literal(""), nonNegative]);
const classification = z.enum(["SHARE_CGT", "FUND_EXIT_TAX_38_2026", "UNKNOWN", "UNSUPPORTED"]);
const schema = z.object({
  eventDate: z.iso.date(),
  kind: z.enum(["BUY", "SELL", "DIVIDEND", "INTEREST", "OTHER"]),
  assetName: z.string().trim().min(1).max(200),
  symbol: z.string().trim().max(40),
  classification,
  quantity: optionalAmount,
  grossAmount: nonNegative,
  feeAmount: nonNegative,
  withholdingAmount: nonNegative,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code"),
  eurAmount: optionalAmount,
  incomeJurisdiction: z.string().trim().max(80),
  interestSourceType: z.string().trim().max(80),
  note: z.string().trim().max(500),
});

function fail(message: string): never {
  redirect(`/investments?error=${encodeURIComponent(message)}`);
}
function value(formData: FormData, key: string, fallback = "") {
  const item = formData.get(key);
  return typeof item === "string" ? item : fallback;
}
function revalidate() {
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/filing");
}

export async function addEntry(formData: FormData): Promise<void> {
  const parsed = schema.safeParse(
    Object.fromEntries(
      [
        "eventDate",
        "kind",
        "assetName",
        "symbol",
        "classification",
        "quantity",
        "grossAmount",
        "feeAmount",
        "withholdingAmount",
        "currency",
        "eurAmount",
        "incomeJurisdiction",
        "interestSourceType",
        "note",
      ].map((key) => [
        key,
        value(formData, key, key === "feeAmount" || key === "withholdingAmount" ? "0" : ""),
      ]),
    ),
  );
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check the investment details");
  const entry = parsed.data;
  if (!entry.eventDate.startsWith("2026-")) fail("This workspace accepts 2026 events only");
  if ((entry.kind === "BUY" || entry.kind === "SELL") && !entry.quantity)
    fail("Enter a quantity for a trade");
  const hasEur = entry.currency === "EUR" || entry.eurAmount !== "";
  const confirmed =
    formData.has("classificationConfirmed") &&
    entry.classification !== "UNKNOWN" &&
    hasEur &&
    (entry.kind === "BUY" || entry.kind === "SELL");
  const { supabase, userId } = await requireUser();
  await addInvestmentEntry(supabase, userId, {
    taxYear: Number(entry.eventDate.slice(0, 4)),
    eventDate: entry.eventDate,
    kind: entry.kind,
    assetName: entry.assetName,
    symbol: entry.symbol || null,
    classification: entry.classification,
    quantity: entry.quantity || null,
    grossAmount: entry.grossAmount,
    feeAmount: entry.feeAmount,
    withholdingAmount: entry.withholdingAmount,
    currency: entry.currency,
    eurAmount: entry.currency === "EUR" ? entry.grossAmount : entry.eurAmount || null,
    incomeJurisdiction: entry.incomeJurisdiction || null,
    interestSourceType: entry.interestSourceType || null,
    source: "MANUAL",
    externalId: null,
    importBatchId: null,
    reviewStatus: confirmed ? "CONFIRMED" : "REQUIRES_REVIEW",
    note: entry.note || null,
  });
  revalidate();
  redirect("/investments?saved=1");
}

export async function confirmEntry(formData: FormData): Promise<void> {
  const id = value(formData, "id");
  const parsed = z
    .object({
      classification,
      grossAmount: nonNegative,
      feeAmount: nonNegative,
      withholdingAmount: nonNegative,
      eurAmount: optionalAmount,
      incomeJurisdiction: z.string().trim().max(80),
      interestSourceType: z.string().trim().max(80),
    })
    .safeParse({
      classification: value(formData, "classification"),
      grossAmount: value(formData, "grossAmount"),
      feeAmount: value(formData, "feeAmount"),
      withholdingAmount: value(formData, "withholdingAmount"),
      eurAmount: value(formData, "eurAmount"),
      incomeJurisdiction: value(formData, "incomeJurisdiction"),
      interestSourceType: value(formData, "interestSourceType"),
    });
  if (!z.uuid().safeParse(id).success || !parsed.success) fail("Check the review fields");
  const { supabase, userId } = await requireUser();
  const entry = await getInvestmentEntry(supabase, userId, id);
  if (!entry) fail("Entry was not found");
  const eurAmount =
    entry.currency === "EUR" ? parsed.data.grossAmount : parsed.data.eurAmount || null;
  const isTrade = entry.kind === "BUY" || entry.kind === "SELL";
  const confirmed =
    eurAmount !== null &&
    (isTrade
      ? parsed.data.classification === "SHARE_CGT" ||
        parsed.data.classification === "FUND_EXIT_TAX_38_2026"
      : parsed.data.incomeJurisdiction !== "" &&
        (entry.kind !== "INTEREST" || parsed.data.interestSourceType !== ""));
  await updateInvestmentReview(supabase, userId, id, {
    classification: parsed.data.classification,
    grossAmount: parsed.data.grossAmount,
    feeAmount: parsed.data.feeAmount,
    withholdingAmount: parsed.data.withholdingAmount,
    eurAmount,
    incomeJurisdiction: parsed.data.incomeJurisdiction || null,
    interestSourceType: parsed.data.interestSourceType || null,
    reviewStatus: confirmed ? "CONFIRMED" : "REQUIRES_REVIEW",
  });
  revalidate();
  redirect("/investments");
}

export async function removeEntry(formData: FormData): Promise<void> {
  const id = value(formData, "id");
  if (!z.uuid().safeParse(id).success) fail("Entry was not found");
  const { supabase, userId } = await requireUser();
  await deleteInvestmentEntry(supabase, userId, id);
  revalidate();
  redirect("/investments");
}
