import { d, toDecimalString, type DecimalString, ZERO } from "@/lib/utils/decimal";
import type { IncomeTaxResult } from "./income-tax";
import type { UscResult } from "./usc";

export type AnnualTaxPosition = {
  taxYear: number;
  employmentIncomeEur: DecimalString;
  dividendIncomeEur: DecimalString;
  interestIncomeEur: DecimalString;
  estimatedIncomeTaxLiabilityEur: DecimalString;
  estimatedUscLiabilityEur: DecimalString;
  payeIncomeTaxPaidEur: DecimalString;
  uscPaidEur: DecimalString;
  estimatedIncomeTaxOverpaymentEur: DecimalString;
  estimatedIncomeTaxUnderpaymentEur: DecimalString;
  estimatedUscOverpaymentEur: DecimalString;
  estimatedUscUnderpaymentEur: DecimalString;
  estimatedPayeRefundEur: DecimalString;
  estimatedPayeUnderpaymentEur: DecimalString;
  cgtLiabilityEur: DecimalString;
  fundTaxLiabilityEur: DecimalString;
  unresolvedItemsCount: number;
  finalEstimateStatus: "COMPLETE" | "INCOMPLETE_REVIEW_REQUIRED" | "UNSUPPORTED";
};

export function createAnnualTaxPosition(input: {
  taxYear: number;
  employmentIncomeEur: DecimalString;
  dividendIncomeEur: DecimalString;
  interestIncomeEur: DecimalString;
  incomeTax: IncomeTaxResult;
  usc: UscResult;
  cgtLiabilityEur?: DecimalString;
  fundTaxLiabilityEur?: DecimalString;
  unresolvedItemsCount: number;
  supportedProfile: boolean;
}): AnnualTaxPosition {
  const refund = toDecimalString(d(input.incomeTax.overpayment).plus(input.usc.overpayment));
  const underpayment = toDecimalString(
    d(input.incomeTax.underpayment).plus(input.usc.underpayment),
  );
  return {
    taxYear: input.taxYear,
    employmentIncomeEur: input.employmentIncomeEur,
    dividendIncomeEur: input.dividendIncomeEur,
    interestIncomeEur: input.interestIncomeEur,
    estimatedIncomeTaxLiabilityEur: input.incomeTax.estimatedIncomeTaxLiability,
    estimatedUscLiabilityEur: input.usc.estimatedUscLiability,
    payeIncomeTaxPaidEur: input.incomeTax.incomeTaxAlreadyPaid,
    uscPaidEur: input.usc.uscAlreadyPaid,
    estimatedIncomeTaxOverpaymentEur: input.incomeTax.overpayment,
    estimatedIncomeTaxUnderpaymentEur: input.incomeTax.underpayment,
    estimatedUscOverpaymentEur: input.usc.overpayment,
    estimatedUscUnderpaymentEur: input.usc.underpayment,
    estimatedPayeRefundEur: refund,
    estimatedPayeUnderpaymentEur: underpayment,
    cgtLiabilityEur: input.cgtLiabilityEur ?? ZERO,
    fundTaxLiabilityEur: input.fundTaxLiabilityEur ?? ZERO,
    unresolvedItemsCount: input.unresolvedItemsCount,
    finalEstimateStatus: !input.supportedProfile
      ? "UNSUPPORTED"
      : input.unresolvedItemsCount > 0
        ? "INCOMPLETE_REVIEW_REQUIRED"
        : "COMPLETE",
  };
}
