import { describe, expect, it } from "vitest";
import { calculateFundPosition2026 } from "@/lib/domain/investments/fund-events";
import { normaliseIsin } from "@/lib/domain/investments/share-gains";
import { funds2026 } from "@/lib/rules/ie/2026/funds";
import type { FundUnitValuation, InvestmentEntry } from "@/lib/supabase/investments";

const isin = "IE00B4L5Y983";

function trade(
  id: string,
  date: string,
  kind: "BUY" | "SELL",
  quantity: string,
  eurAmount: string,
  overrides: Partial<InvestmentEntry> = {},
): InvestmentEntry {
  return {
    id,
    taxYear: Number(date.slice(0, 4)),
    eventDate: date,
    kind,
    assetName: "Example equivalent offshore fund",
    symbol: isin,
    classification: "FUND_EXIT_TAX_38_2026",
    quantity,
    grossAmount: eurAmount,
    feeAmount: "0",
    withholdingAmount: "0",
    currency: "EUR",
    eurAmount,
    incomeJurisdiction: null,
    interestSourceType: null,
    source: "MANUAL",
    externalId: null,
    importBatchId: null,
    reviewStatus: "CONFIRMED",
    note: null,
    fundTaxMethod: "OFFSHORE_EQUIVALENT_FIFO",
    fundDeemedStartDate: null,
    ...overrides,
  };
}

function valuation(date: string, value: string): FundUnitValuation {
  return {
    isin,
    valuationDate: date,
    unitValueEur: value,
    evidenceNote: "Broker statement on anniversary date",
  };
}

describe("2026 equivalent offshore fund event tracking", () => {
  it("uses Revenue's 2026 individual rate without applying it to draft gains", () => {
    expect(funds2026.equivalentOffshoreIndividualRate).toBe("0.38");
    expect(funds2026.deemedDisposalYears).toBe(8);
  });

  it("requires a valid ISIN and verified FIFO tax method", () => {
    expect(normaliseIsin(isin)).toBe(isin);
    const invalid = calculateFundPosition2026(
      [trade("buy", "2024-01-01", "BUY", "1", "100", { symbol: "ETF" })],
      [],
    );
    expect(invalid.issues[0].reason).toContain("valid ISIN");
    expect(invalid.nextAnniversaries).toHaveLength(0);

    const unverified = calculateFundPosition2026(
      [trade("buy", "2024-01-01", "BUY", "1", "100", { fundTaxMethod: null })],
      [],
    );
    expect(unverified.issues[0].reason).toContain("equivalent offshore fund");
  });

  it("schedules and values an eight-year event from a documented EUR unit price", () => {
    const result = calculateFundPosition2026(
      [
        trade("buy", "2018-06-15", "BUY", "10", "1000", {
          feeAmount: "10",
          fundDeemedStartDate: "2018-06-15",
        }),
      ],
      [valuation("2026-06-15", "150")],
    );
    expect(result.issues).toHaveLength(0);
    expect(result.events).toMatchObject([
      {
        kind: "EIGHT_YEAR_DEEMED",
        eventDate: "2026-06-15",
        quantity: "10",
        status: "CALCULATED",
        valueEur: "1500",
        costEur: "1010",
        differenceEur: "490",
      },
    ]);
    expect(result.nextAnniversaries[0].dueDate).toBe("2034-06-15");
  });

  it("leaves an anniversary uncalculated without an exact-date EUR value", () => {
    const result = calculateFundPosition2026(
      [
        trade("buy", "2018-06-15", "BUY", "1", "100", {
          fundDeemedStartDate: "2018-06-15",
        }),
      ],
      [],
    );
    expect(result.events[0].status).toBe("REVIEW_REQUIRED");
    expect(result.events[0].differenceEur).toBeNull();
    expect(result.events[0].reason).toContain("EUR value per unit");
  });

  it("reduces the anniversary holding for a partial earlier FIFO sale", () => {
    const result = calculateFundPosition2026(
      [
        trade("buy", "2018-06-15", "BUY", "10", "1000", {
          fundDeemedStartDate: "2018-06-15",
        }),
        trade("sale", "2025-02-01", "SELL", "4", "600"),
      ],
      [valuation("2026-06-15", "150")],
    );
    expect(result.events).toMatchObject([
      {
        quantity: "6",
        valueEur: "900",
        costEur: "600",
        differenceEur: "300",
      },
    ]);
    expect(result.nextAnniversaries[0].remainingQuantity).toBe("6");
  });

  it("tracks recurring anniversaries without resetting the original recorded cost", () => {
    const result = calculateFundPosition2026(
      [
        trade("buy", "2010-06-15", "BUY", "1", "100", {
          fundDeemedStartDate: "2010-06-15",
        }),
      ],
      [valuation("2018-06-15", "150"), valuation("2026-06-15", "180")],
    );
    expect(result.events.map((event) => [event.eventDate, event.differenceEur])).toEqual([
      ["2026-06-15", "80"],
      ["2018-06-15", "50"],
    ]);
    expect(result.nextAnniversaries[0].dueDate).toBe("2034-06-15");
  });

  it("requires an explicit start for a pre-2022 purchase, including transitional ETFs", () => {
    const buy = trade("buy", "2018-01-01", "BUY", "1", "100");
    const missing = calculateFundPosition2026([buy], []);
    expect(missing.issues[0].reason).toContain("pre-2022");
    const transitional = calculateFundPosition2026(
      [{ ...buy, fundDeemedStartDate: "2022-01-01" }],
      [],
    );
    expect(transitional.events).toHaveLength(0);
    expect(transitional.nextAnniversaries[0].dueDate).toBe("2030-01-01");
  });

  it("matches 2026 sales to recorded FIFO lots but does not compute tax payable", () => {
    const result = calculateFundPosition2026(
      [
        trade("old", "2023-01-01", "BUY", "5", "500"),
        trade("new", "2024-01-01", "BUY", "5", "1000"),
        trade("sale", "2026-06-01", "SELL", "7", "1400", { feeAmount: "7" }),
      ],
      [],
    );
    const [sale] = result.events;
    expect(sale.kind).toBe("SALE");
    expect(sale.matches.map((match) => [match.purchaseId, match.quantity])).toEqual([
      ["old", "5"],
      ["new", "2"],
    ]);
    expect(sale.costEur).toBe("900");
    expect(sale.valueEur).toBe("1393");
    expect(sale.differenceEur).toBe("493");
    expect(result.nextAnniversaries.map((item) => [item.purchaseId, item.dueDate])).toEqual([
      ["new", "2032-01-01"],
    ]);
  });

  it("blocks missing history, conflicting classifications and unconverted fees", () => {
    const missing = calculateFundPosition2026(
      [trade("sale", "2026-06-01", "SELL", "1", "200")],
      [],
    );
    expect(missing.events).toHaveLength(0);
    expect(missing.issues[0].reason).toContain("do not cover");

    const conflict = calculateFundPosition2026(
      [
        trade("buy", "2024-01-01", "BUY", "1", "100", { classification: "SHARE_CGT" }),
        trade("sale", "2026-06-01", "SELL", "1", "200"),
      ],
      [],
    );
    expect(conflict.issues[0].reason).toContain("Confirm every trade");

    const fee = calculateFundPosition2026(
      [
        trade("buy", "2024-01-01", "BUY", "1", "100", {
          grossAmount: "110",
          currency: "USD",
          feeAmount: "1",
        }),
      ],
      [],
    );
    expect(fee.issues[0].reason).toContain("non-EUR trade");
  });

  it("blocks ambiguous trade order and sale on an anniversary", () => {
    const sameDay = calculateFundPosition2026(
      [
        trade("buy-a", "2024-01-01", "BUY", "1", "100"),
        trade("buy-b", "2024-01-01", "BUY", "1", "200"),
      ],
      [],
    );
    expect(sameDay.issues[0].reason).toContain("share a date");

    const saleOnDueDate = calculateFundPosition2026(
      [
        trade("buy", "2018-01-01", "BUY", "1", "100", {
          fundDeemedStartDate: "2018-01-01",
        }),
        trade("sale", "2026-01-01", "SELL", "1", "200"),
      ],
      [],
    );
    expect(saleOnDueDate.issues[0].reason).toContain("anniversary");
  });
});
