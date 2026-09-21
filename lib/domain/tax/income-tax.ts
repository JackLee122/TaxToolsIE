import {
  d,
  max,
  min,
  mul,
  sub,
  toDecimalString,
  type DecimalString,
  ZERO,
} from "@/lib/utils/decimal";
import { incomeTax2026 } from "@/lib/rules/ie/2026/incomeTax";

export type IncomeTaxInput = {
  payeTaxableIncome: DecimalString;
  dividendIncome: DecimalString;
  additionalTaxableIncome: DecimalString;
  relievablePensionDeductions: DecimalString;
  preTaxDeductions: DecimalString;
  additionalCredits: DecimalString;
  incomeTaxAlreadyPaid: DecimalString;
};

export type IncomeTaxResult = {
  taxableIncomeBeforeDeductions: DecimalString;
  deductibleReliefs: DecimalString;
  taxableIncome: DecimalString;
  standardRateIncome: DecimalString;
  higherRateIncome: DecimalString;
  standardRateTax: DecimalString;
  higherRateTax: DecimalString;
  grossIncomeTax: DecimalString;
  personalTaxCredit: DecimalString;
  employeeTaxCredit: DecimalString;
  additionalCredits: DecimalString;
  creditsApplied: DecimalString;
  unusedCredits: DecimalString;
  estimatedIncomeTaxLiability: DecimalString;
  incomeTaxAlreadyPaid: DecimalString;
  overpayment: DecimalString;
  underpayment: DecimalString;
};

export function employeeTaxCredit2026(payeIncome: DecimalString): DecimalString {
  return min(
    mul(max(payeIncome, ZERO), incomeTax2026.standardRate),
    incomeTax2026.employeeTaxCreditMaximum as DecimalString,
  );
}

export function calculateIncomeTax2026(input: IncomeTaxInput): IncomeTaxResult {
  const incomeBeforeDeductions = toDecimalString(
    d(input.payeTaxableIncome).plus(input.dividendIncome).plus(input.additionalTaxableIncome),
  );
  const deductions = toDecimalString(
    d(input.relievablePensionDeductions).plus(input.preTaxDeductions),
  );
  const taxableIncome = max(sub(incomeBeforeDeductions, deductions), ZERO);
  const standardRateIncome = min(
    taxableIncome,
    incomeTax2026.singleStandardRateCutoff as DecimalString,
  );
  const higherRateIncome = max(sub(taxableIncome, standardRateIncome), ZERO);
  const standardRateTax = mul(standardRateIncome, incomeTax2026.standardRate);
  const higherRateTax = mul(higherRateIncome, incomeTax2026.higherRate);
  const grossIncomeTax = toDecimalString(d(standardRateTax).plus(higherRateTax));
  const personalTaxCredit = incomeTax2026.personalTaxCredit as DecimalString;
  const employeeTaxCredit = employeeTaxCredit2026(input.payeTaxableIncome);
  const requestedCredits = toDecimalString(
    d(personalTaxCredit).plus(employeeTaxCredit).plus(input.additionalCredits),
  );
  const creditsApplied = min(grossIncomeTax, requestedCredits);
  const liability = max(sub(grossIncomeTax, creditsApplied), ZERO);
  const overpayment = max(sub(input.incomeTaxAlreadyPaid, liability), ZERO);
  const underpayment = max(sub(liability, input.incomeTaxAlreadyPaid), ZERO);

  return {
    taxableIncomeBeforeDeductions: incomeBeforeDeductions,
    deductibleReliefs: deductions,
    taxableIncome,
    standardRateIncome,
    higherRateIncome,
    standardRateTax,
    higherRateTax,
    grossIncomeTax,
    personalTaxCredit,
    employeeTaxCredit,
    additionalCredits: input.additionalCredits,
    creditsApplied,
    unusedCredits: max(sub(requestedCredits, creditsApplied), ZERO),
    estimatedIncomeTaxLiability: liability,
    incomeTaxAlreadyPaid: input.incomeTaxAlreadyPaid,
    overpayment,
    underpayment,
  };
}
