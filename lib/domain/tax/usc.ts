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
import { usc2026 } from "@/lib/rules/ie/2026/usc";

export type UscInput = {
  payeUscLiableIncome: DecimalString;
  dividendIncome: DecimalString;
  additionalUscLiableIncome: DecimalString;
  uscAlreadyPaid: DecimalString;
};

export type UscBandResult = {
  upTo: DecimalString | null;
  rate: DecimalString;
  income: DecimalString;
  charge: DecimalString;
};
export type UscResult = {
  uscLiableIncome: DecimalString;
  exempt: boolean;
  bands: UscBandResult[];
  estimatedUscLiability: DecimalString;
  uscAlreadyPaid: DecimalString;
  overpayment: DecimalString;
  underpayment: DecimalString;
};

export function calculateUsc2026(input: UscInput): UscResult {
  const income = toDecimalString(
    d(input.payeUscLiableIncome).plus(input.dividendIncome).plus(input.additionalUscLiableIncome),
  );
  if (d(income).lte(usc2026.exemptionThreshold)) {
    return {
      uscLiableIncome: income,
      exempt: true,
      bands: [],
      estimatedUscLiability: ZERO,
      uscAlreadyPaid: input.uscAlreadyPaid,
      overpayment: max(input.uscAlreadyPaid, ZERO),
      underpayment: ZERO,
    };
  }

  let previousUpper = ZERO;
  let charge = d(ZERO);
  const bands = usc2026.bands.map((band) => {
    const bandUpper = band.upTo as DecimalString | null;
    const width = bandUpper ? sub(bandUpper, previousUpper) : income;
    const taxableAtBand = max(min(sub(income, previousUpper), width), ZERO);
    const bandCharge = mul(taxableAtBand, band.rate);
    charge = charge.plus(bandCharge);
    if (bandUpper) previousUpper = bandUpper;
    return {
      upTo: bandUpper,
      rate: band.rate as DecimalString,
      income: taxableAtBand,
      charge: bandCharge,
    };
  });
  const liability = toDecimalString(charge);
  return {
    uscLiableIncome: income,
    exempt: false,
    bands,
    estimatedUscLiability: liability,
    uscAlreadyPaid: input.uscAlreadyPaid,
    overpayment: max(sub(input.uscAlreadyPaid, liability), ZERO),
    underpayment: max(sub(liability, input.uscAlreadyPaid), ZERO),
  };
}
