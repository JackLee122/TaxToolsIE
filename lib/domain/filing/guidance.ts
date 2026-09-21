export type FilingRoute =
  "MYACCOUNT_PAYE_RETURN" | "SELF_ASSESSMENT_REVIEW_REQUIRED" | "SELF_ASSESSMENT_FORM_11";

import { d, type DecimalString } from "@/lib/utils/decimal";

export function classifyFilingRoute(input: {
  taxableNonPayeIncomeEur: DecimalString;
  grossNonPayeIncomeEur: DecimalString;
}): FilingRoute {
  // Revenue's boundary wording needs a dedicated verified rule. Exactly €5,000
  // is deliberately held for review rather than guessed.
  const taxable = d(input.taxableNonPayeIncomeEur);
  const gross = d(input.grossNonPayeIncomeEur);
  if (taxable.eq("5000")) return "SELF_ASSESSMENT_REVIEW_REQUIRED";
  if (taxable.gt("5000") || gross.gt("30000")) return "SELF_ASSESSMENT_FORM_11";
  return "MYACCOUNT_PAYE_RETURN";
}

export function unemploymentClaimGuidance(input: {
  employmentEndDate: string;
  emergencyTaxApplied: boolean;
  leavingIrelandPermanently: boolean;
  hasOtherTaxableIncome: boolean;
  receivesTaxableSocialWelfare: boolean;
}): { earliestClaimDate: string; reason: string; revenuePath: string } {
  if (input.emergencyTaxApplied || input.leavingIrelandPermanently) {
    return {
      earliestClaimDate: input.employmentEndDate,
      reason: input.emergencyTaxApplied
        ? "Emergency tax was applied in the last employment."
        : "You indicated that you are leaving Ireland permanently.",
      revenuePath: "myAccount → PAYE Services → Claim unemployment repayment",
    };
  }
  const date = new Date(`${input.employmentEndDate}T00:00:00Z`);
  date.setUTCDate(
    date.getUTCDate() +
      (input.hasOtherTaxableIncome || input.receivesTaxableSocialWelfare ? 56 : 28),
  );
  return {
    earliestClaimDate: date.toISOString().slice(0, 10),
    reason:
      input.hasOtherTaxableIncome || input.receivesTaxableSocialWelfare
        ? "Other taxable income means the eight-week guidance applies."
        : "No other taxable income means the four-week guidance applies.",
    revenuePath: "myAccount → PAYE Services → Claim unemployment repayment",
  };
}
