import { credits2026 } from "./credits";
import { cgt2026 } from "./cgt";
import { deadlines2026 } from "./deadlines";
import { funds2026 } from "./funds";
import { incomeTax2026 } from "./incomeTax";
import { usc2026 } from "./usc";

export const rules2026 = {
  version: "ie-2026.3",
  taxYear: 2026,
  incomeTax: incomeTax2026,
  usc: usc2026,
  credits: credits2026,
  cgt: cgt2026,
  funds: funds2026,
  deadlines: deadlines2026,
} as const;
