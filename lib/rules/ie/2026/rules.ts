import { credits2026 } from "./credits";
import { deadlines2026 } from "./deadlines";
import { incomeTax2026 } from "./incomeTax";
import { usc2026 } from "./usc";

export const rules2026 = {
  version: "ie-2026.1",
  taxYear: 2026,
  incomeTax: incomeTax2026,
  usc: usc2026,
  credits: credits2026,
  deadlines: deadlines2026,
} as const;
