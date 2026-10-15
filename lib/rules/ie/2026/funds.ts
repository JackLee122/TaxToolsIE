import { sources } from "./sources";

export const funds2026 = {
  equivalentOffshoreIndividualRate: "0.38",
  deemedDisposalYears: 8,
  rateSource: sources.fundRate,
  calculationSource: sources.offshoreFunds,
  transitionSource: sources.etfTransition,
} as const;
