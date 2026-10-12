import type { EmploymentRecordRow } from "@/lib/db/repositories/employment";
import { add, type DecimalString, ZERO } from "@/lib/utils/decimal";
import { calculateIncomeTax2026, type IncomeTaxResult } from "@/lib/domain/tax/income-tax";
import { calculateUsc2026, type UscResult } from "@/lib/domain/tax/usc";
import { createAnnualTaxPosition, type AnnualTaxPosition } from "@/lib/domain/tax/annual-position";

export type EmploymentTotals = {
  grossPay: DecimalString;
  payForIncomeTax: DecimalString;
  payForUsc: DecimalString;
  incomeTaxDeducted: DecimalString;
  uscDeducted: DecimalString;
  prsiDeducted: DecimalString;
  pensionContributionsPayrollRelieved: DecimalString;
};

export type EmploymentTaxSummary = {
  totals: EmploymentTotals;
  incomeTax: IncomeTaxResult;
  usc: UscResult;
  position: AnnualTaxPosition;
};

const emptyTotals = (): EmploymentTotals => ({
  grossPay: ZERO,
  payForIncomeTax: ZERO,
  payForUsc: ZERO,
  incomeTaxDeducted: ZERO,
  uscDeducted: ZERO,
  prsiDeducted: ZERO,
  pensionContributionsPayrollRelieved: ZERO,
});

export function sumEmploymentRecords(records: EmploymentRecordRow[]): EmploymentTotals {
  return records.reduce<EmploymentTotals>(
    (totals, record) => ({
      grossPay: add(totals.grossPay, record.grossPay),
      payForIncomeTax: add(totals.payForIncomeTax, record.payForIncomeTax),
      payForUsc: add(totals.payForUsc, record.payForUsc),
      incomeTaxDeducted: add(totals.incomeTaxDeducted, record.incomeTaxDeducted),
      uscDeducted: add(totals.uscDeducted, record.uscDeducted),
      prsiDeducted: add(totals.prsiDeducted, record.prsiDeducted),
      pensionContributionsPayrollRelieved: add(
        totals.pensionContributionsPayrollRelieved,
        record.pensionContributionsPayrollRelieved ?? ZERO,
      ),
    }),
    emptyTotals(),
  );
}

export function calculateEmploymentTaxSummary(
  taxYear: number,
  records: EmploymentRecordRow[],
  supportedProfile: boolean,
  additionalCredits: DecimalString = ZERO,
  unresolvedItemsCount = 0,
): EmploymentTaxSummary {
  const totals = sumEmploymentRecords(records);
  const incomeTax = calculateIncomeTax2026({
    payeTaxableIncome: totals.payForIncomeTax,
    dividendIncome: ZERO,
    additionalTaxableIncome: ZERO,
    // Payroll-relieved pension contributions are already reflected in taxable pay.
    relievablePensionDeductions: ZERO,
    preTaxDeductions: ZERO,
    additionalCredits,
    incomeTaxAlreadyPaid: totals.incomeTaxDeducted,
  });
  const usc = calculateUsc2026({
    payeUscLiableIncome: totals.payForUsc,
    dividendIncome: ZERO,
    additionalUscLiableIncome: ZERO,
    uscAlreadyPaid: totals.uscDeducted,
  });
  return {
    totals,
    incomeTax,
    usc,
    position: createAnnualTaxPosition({
      taxYear,
      employmentIncomeEur: totals.payForIncomeTax,
      dividendIncomeEur: ZERO,
      interestIncomeEur: ZERO,
      incomeTax,
      usc,
      unresolvedItemsCount,
      supportedProfile,
    }),
  };
}
