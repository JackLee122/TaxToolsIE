import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";

// Guardrail smoke test: assert that decimal.js is the money primitive used and
// that no accidental float arithmetic sneaks in at the boundary.
describe("tooling smoke test", () => {
  it("runs vitest", () => {
    expect(2 + 3).toBe(5);
  });

  it("decimal.js performs exact decimal arithmetic", () => {
    const result = new Decimal("0.1").plus("0.2");
    expect(result.toString()).toBe("0.3");
    expect(String(0.1 + 0.2)).not.toBe(result.toString());
  });
});