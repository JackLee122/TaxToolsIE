import { sources } from "./sources";

export const incomeTax2026 = {
  id: "IE-IT-2026-SINGLE-PAYE",
  taxYear: 2026,
  standardRate: "0.20",
  higherRate: "0.40",
  singleStandardRateCutoff: "44000",
  personalTaxCredit: "2000",
  employeeTaxCreditMaximum: "2000",
  employeeTaxCreditFullIncomeThreshold: "10000",
  source: sources.incomeTax,
  employeeCreditSource: sources.employeeCredit,
} as const;
