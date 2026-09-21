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
import { credits2026 } from "@/lib/rules/ie/2026/credits";

export type ClaimResult = {
  eligible: boolean;
  requiresReview: boolean;
  eligibleAmount: DecimalString;
  estimatedTaxValue: DecimalString;
  explanation: string;
};

export function calculateRentCredit2026(input: {
  rentPaid: DecimalString;
  utilitiesAndServices: DecimalString;
  eligibleUseConfirmed: boolean;
  unrelatedLandlordConfirmed: boolean;
  tenancyConfirmed: boolean;
}): ClaimResult {
  const qualifyingRent = max(sub(input.rentPaid, input.utilitiesAndServices), ZERO);
  const confirmed =
    input.eligibleUseConfirmed && input.unrelatedLandlordConfirmed && input.tenancyConfirmed;
  return {
    eligible: confirmed,
    requiresReview: !confirmed,
    eligibleAmount: qualifyingRent,
    estimatedTaxValue: confirmed
      ? min(
          mul(qualifyingRent, credits2026.rentReliefRate),
          credits2026.rentCreditMaximum as DecimalString,
        )
      : ZERO,
    explanation: confirmed
      ? "20% of qualifying rent, capped at the 2026 single-person maximum."
      : "Eligibility confirmations are required before this credit can be included.",
  };
}

export function calculateHealthRelief2026(
  expensePaid: DecimalString,
  reimbursements: DecimalString,
  qualifyingConfirmed: boolean,
): ClaimResult {
  const eligibleAmount = max(sub(expensePaid, reimbursements), ZERO);
  return {
    eligible: qualifyingConfirmed,
    requiresReview: !qualifyingConfirmed,
    eligibleAmount,
    estimatedTaxValue: qualifyingConfirmed
      ? mul(eligibleAmount, credits2026.healthReliefRate)
      : ZERO,
    explanation: qualifyingConfirmed
      ? "20% relief on qualifying unreimbursed health expenses."
      : "The expense must be confirmed as qualifying before relief is included.",
  };
}

export function calculateTuitionRelief2026(input: {
  qualifyingFees: DecimalString;
  fullTimeApprovedCourseConfirmed: boolean;
}): ClaimResult {
  const cappedFees = min(
    input.qualifyingFees,
    credits2026.tuitionFeeCapPerStudentCourse as DecimalString,
  );
  const eligibleAmount = max(
    sub(cappedFees, credits2026.fullTimeTuitionDisregard as DecimalString),
    ZERO,
  );
  return {
    eligible: input.fullTimeApprovedCourseConfirmed,
    requiresReview: !input.fullTimeApprovedCourseConfirmed,
    eligibleAmount,
    estimatedTaxValue: input.fullTimeApprovedCourseConfirmed
      ? mul(eligibleAmount, credits2026.tuitionReliefRate)
      : ZERO,
    explanation: input.fullTimeApprovedCourseConfirmed
      ? "20% relief after the 2026 full-time tuition disregard."
      : "An approved full-time third-level course must be confirmed before relief is included.",
  };
}

export function pensionReliefLimit2026(
  age: number,
  relevantEarnings: DecimalString,
): DecimalString {
  const band = credits2026.pensionAgeLimits.find(
    (candidate) => candidate.youngerThan === null || age < candidate.youngerThan,
  );
  if (!band) throw new Error("No pension age band configured");
  return mul(min(relevantEarnings, credits2026.pensionEarningsCap as DecimalString), band.rate);
}

export function calculatePensionRelief2026(input: {
  age: number;
  relevantEarnings: DecimalString;
  employeeContribution: DecimalString;
  alreadyRelievedThroughPayroll: boolean;
}): ClaimResult {
  const limit = pensionReliefLimit2026(input.age, input.relevantEarnings);
  const eligibleAmount = min(input.employeeContribution, limit);
  return {
    eligible: !input.alreadyRelievedThroughPayroll,
    requiresReview: input.alreadyRelievedThroughPayroll || d(input.employeeContribution).gt(limit),
    eligibleAmount: input.alreadyRelievedThroughPayroll ? ZERO : eligibleAmount,
    estimatedTaxValue: ZERO,
    explanation: input.alreadyRelievedThroughPayroll
      ? "This contribution is already reflected in payroll taxable pay and must not be relieved twice."
      : d(input.employeeContribution).gt(limit)
        ? "The reported contribution exceeds the configured age and earnings limit; only the capped amount is included."
        : "This is a deduction from taxable income, not a tax credit.",
  };
}

export function sumIncomeTaxCredits(values: readonly DecimalString[]): DecimalString {
  return toDecimalString(values.reduce((total, value) => total.plus(value), d(ZERO)));
}
