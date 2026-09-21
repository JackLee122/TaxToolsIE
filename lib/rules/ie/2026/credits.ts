import { sources } from "./sources";

export const credits2026 = {
  id: "IE-CREDITS-2026-SUPPORTED",
  taxYear: 2026,
  rentCreditMaximum: "1000",
  rentReliefRate: "0.20",
  healthReliefRate: "0.20",
  tuitionReliefRate: "0.20",
  tuitionFeeCapPerStudentCourse: "7000",
  fullTimeTuitionDisregard: "3000",
  pensionEarningsCap: "115000",
  pensionAgeLimits: [
    { youngerThan: 30, rate: "0.15" },
    { youngerThan: 40, rate: "0.20" },
    { youngerThan: 50, rate: "0.25" },
    { youngerThan: 55, rate: "0.30" },
    { youngerThan: 60, rate: "0.35" },
    { youngerThan: null, rate: "0.40" },
  ],
  source: sources.ratesAndCredits,
} as const;
