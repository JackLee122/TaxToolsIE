"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addInvestmentEntry,
  updateInvestmentReview,
  deleteInvestmentEntry,
  getInvestmentEntry,
  listInvestmentEntries,
  upsertFundUnitValuation,
} from "@/lib/supabase/investments";
import { calculateFundPosition2026 } from "@/lib/domain/investments/fund-events";
import { normaliseIsin } from "@/lib/domain/investments/share-gains";
import { requireUser } from "@/lib/supabase/server";
import { normalizeDecimal } from "@/lib/validation/money";

const nonNegative = normalizeDecimal().refine(
  (value) => !value.startsWith("-"),
  "Amount must be zero or greater",
);
const optionalAmount = z.union([z.literal(""), nonNegative]);
const classification = z.enum(["SHARE_CGT", "FUND_EXIT_TAX_38_2026", "UNKNOWN", "UNSUPPORTED"]);
const fundTaxMethod = z.enum(["", "OFFSHORE_EQUIVALENT_FIFO"]);
const optionalDate = z.union([z.literal(""), z.iso.date()]);
const schema = z.object({
  eventDate: z.iso.date(),
  kind: z.enum(["BUY", "SELL", "DIVIDEND", "INTEREST", "OTHER"]),
  assetName: z.string().trim().min(1).max(200),
  symbol: z.string().trim().max(40),
  classification,
  fundTaxMethod,
  fundDeemedStartDate: optionalDate,
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

function fundDetailsReady(
  kind: "BUY" | "SELL" | "DIVIDEND" | "INTEREST" | "OTHER",
  eventDate: string,
  method: "" | "OFFSHORE_EQUIVALENT_FIFO",
  startDate: string,
  note: string,
) {
  if (kind !== "BUY" && kind !== "SELL") return false;
  if (method !== "OFFSHORE_EQUIVALENT_FIFO") return false;
  if (!note) return false;
  if (kind === "SELL") return true;
  if (eventDate >= "2022-01-01") return !startDate || startDate === eventDate;
  return startDate >= eventDate && startDate <= "2026-12-31";
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
        "fundTaxMethod",
        "fundDeemedStartDate",
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
  if (entry.eventDate > "2026-12-31") fail("Enter a 2026 or earlier event date");
  if ((entry.kind === "BUY" || entry.kind === "SELL") && !entry.quantity)
    fail("Enter a quantity for a trade");
  const hasEur = entry.currency === "EUR" || entry.eurAmount !== "";
  const confirmed =
    formData.has("classificationConfirmed") &&
    entry.classification !== "UNKNOWN" &&
    hasEur &&
    (entry.kind === "BUY" || entry.kind === "SELL") &&
    (entry.classification !== "FUND_EXIT_TAX_38_2026" ||
      fundDetailsReady(
        entry.kind,
        entry.eventDate,
        entry.fundTaxMethod,
        entry.fundDeemedStartDate,
        entry.note,
      ));
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
    fundTaxMethod:
      entry.classification === "FUND_EXIT_TAX_38_2026" && entry.fundTaxMethod
        ? entry.fundTaxMethod
        : null,
    fundDeemedStartDate:
      entry.classification === "FUND_EXIT_TAX_38_2026" &&
      entry.kind === "BUY" &&
      entry.fundDeemedStartDate
        ? entry.fundDeemedStartDate
        : null,
  });
  revalidate();
  redirect("/investments?saved=1");
}

export async function confirmEntry(formData: FormData): Promise<void> {
  const id = value(formData, "id");
  const parsed = z
    .object({
      symbol: z.string().trim().toUpperCase().max(40),
      classification,
      fundTaxMethod,
      fundDeemedStartDate: optionalDate,
      grossAmount: nonNegative,
      feeAmount: nonNegative,
      withholdingAmount: nonNegative,
      eurAmount: optionalAmount,
      incomeJurisdiction: z.string().trim().max(80),
      interestSourceType: z.string().trim().max(80),
      note: z.string().trim().max(500),
    })
    .safeParse({
      symbol: value(formData, "symbol"),
      classification: value(formData, "classification"),
      fundTaxMethod: value(formData, "fundTaxMethod"),
      fundDeemedStartDate: value(formData, "fundDeemedStartDate"),
      grossAmount: value(formData, "grossAmount"),
      feeAmount: value(formData, "feeAmount"),
      withholdingAmount: value(formData, "withholdingAmount"),
      eurAmount: value(formData, "eurAmount"),
      incomeJurisdiction: value(formData, "incomeJurisdiction"),
      interestSourceType: value(formData, "interestSourceType"),
      note: value(formData, "note"),
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
        (parsed.data.classification === "FUND_EXIT_TAX_38_2026" &&
          formData.has("fundMethodConfirmed") &&
          fundDetailsReady(
            entry.kind,
            entry.eventDate,
            parsed.data.fundTaxMethod,
            parsed.data.fundDeemedStartDate,
            parsed.data.note,
          ))
      : parsed.data.incomeJurisdiction !== "" &&
        (entry.kind !== "INTEREST" || parsed.data.interestSourceType !== ""));
  await updateInvestmentReview(supabase, userId, id, {
    symbol: parsed.data.symbol || null,
    classification: parsed.data.classification,
    grossAmount: parsed.data.grossAmount,
    feeAmount: parsed.data.feeAmount,
    withholdingAmount: parsed.data.withholdingAmount,
    eurAmount,
    incomeJurisdiction: parsed.data.incomeJurisdiction || null,
    interestSourceType: parsed.data.interestSourceType || null,
    note: parsed.data.note || null,
    reviewStatus: confirmed ? "CONFIRMED" : "REQUIRES_REVIEW",
    fundTaxMethod:
      parsed.data.classification === "FUND_EXIT_TAX_38_2026" && parsed.data.fundTaxMethod
        ? parsed.data.fundTaxMethod
        : null,
    fundDeemedStartDate:
      parsed.data.classification === "FUND_EXIT_TAX_38_2026" &&
      entry.kind === "BUY" &&
      parsed.data.fundDeemedStartDate
        ? parsed.data.fundDeemedStartDate
        : null,
  });
  revalidate();
  redirect("/investments");
}

export async function saveFundValuation(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      isin: z.string().trim().toUpperCase(),
      valuationDate: z.iso.date(),
      unitValueEur: normalizeDecimal().refine(
        (amount) => amount !== "0" && !amount.startsWith("-"),
        "Unit value must be greater than zero",
      ),
      evidenceNote: z.string().trim().min(5).max(500),
    })
    .safeParse({
      isin: value(formData, "isin"),
      valuationDate: value(formData, "valuationDate"),
      unitValueEur: value(formData, "unitValueEur"),
      evidenceNote: value(formData, "evidenceNote"),
    });
  if (!parsed.success || !normaliseIsin(parsed.data.isin)) fail("Check the fund valuation fields");
  const { supabase, userId } = await requireUser();
  const entries = await listInvestmentEntries(supabase, userId);
  const eligible = calculateFundPosition2026(entries, []).events.some(
    (event) =>
      event.kind === "EIGHT_YEAR_DEEMED" &&
      event.isin === parsed.data.isin &&
      event.eventDate === parsed.data.valuationDate,
  );
  if (!eligible) fail("Confirm the fund history before adding this anniversary valuation");
  await upsertFundUnitValuation(supabase, userId, parsed.data);
  revalidate();
  redirect("/investments?saved=1");
}

export async function removeEntry(formData: FormData): Promise<void> {
  const id = value(formData, "id");
  if (!z.uuid().safeParse(id).success) fail("Entry was not found");
  const { supabase, userId } = await requireUser();
  await deleteInvestmentEntry(supabase, userId, id);
  revalidate();
  redirect("/investments");
}
