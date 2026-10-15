import { sources } from "./sources";

export const cgt2026 = {
  id: "IE-CGT-2026-ORDINARY-SHARES",
  taxYear: 2026,
  standardRateBeforeChange: "0.33",
  standardRateFromChange: "0.31",
  reducedRateEffectiveDate: "2026-10-07",
  annualPersonalExemption: "1270",
  shareMatchingWindowDays: 28,
  rateSource: sources.cgtRates,
  matchingSource: sources.shareIdentification,
} as const;

export function standardShareCgtRate2026(disposalDate: string): string {
  if (!disposalDate.startsWith("2026-")) throw new Error("Only 2026 disposals are supported");
  return disposalDate < cgt2026.reducedRateEffectiveDate
    ? cgt2026.standardRateBeforeChange
    : cgt2026.standardRateFromChange;
}
