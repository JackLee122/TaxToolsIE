import { describe, expect, it } from "vitest";
import { sumConfirmedIncomeTaxCredits } from "@/lib/domain/tax/credits";

describe("annual confirmed credit totals", () => {
  it("caps total rent credit and excludes unconfirmed or previously claimed items", () => {
    expect(
      sumConfirmedIncomeTaxCredits([
        { type: "RENT_TAX_CREDIT", status: "USER_CONFIRMED", estimatedTaxValue: "800" },
        { type: "RENT_TAX_CREDIT", status: "USER_CONFIRMED", estimatedTaxValue: "500" },
        { type: "HEALTH_EXPENSE_RELIEF", status: "USER_CONFIRMED", estimatedTaxValue: "60" },
        { type: "TUITION_FEE_RELIEF", status: "ALREADY_CLAIMED", estimatedTaxValue: "200" },
        { type: "PENSION_RELIEF", status: "POTENTIALLY_ELIGIBLE", estimatedTaxValue: "900" },
      ]),
    ).toBe("1060");
  });
});
