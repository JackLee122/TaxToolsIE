import { sources } from "./sources";

export const usc2026 = {
  id: "IE-USC-2026-STANDARD",
  taxYear: 2026,
  exemptionThreshold: "13000",
  bands: [
    { upTo: "12012", rate: "0.005" },
    { upTo: "28700", rate: "0.02" },
    { upTo: "70044", rate: "0.03" },
    { upTo: null, rate: "0.08" },
  ],
  source: sources.usc,
} as const;
