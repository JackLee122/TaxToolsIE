import { sources } from "./sources";

export const deadlines2026 = {
  id: "IE-DEADLINES-2026",
  taxYear: 2026,
  cgtInitialPeriodPaymentDate: "2026-12-15",
  cgtLaterPeriodPaymentDate: "2027-01-31",
  cgtReturnDate: "2027-10-31",
  source: sources.cgt,
} as const;
