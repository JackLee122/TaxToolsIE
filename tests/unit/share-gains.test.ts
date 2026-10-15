import { describe, expect, it } from "vitest";
import { calculateShareSaleGains2026, normaliseIsin } from "@/lib/domain/investments/share-gains";
import { cgt2026, standardShareCgtRate2026 } from "@/lib/rules/ie/2026/cgt";
import { incomeTax2026 } from "@/lib/rules/ie/2026/incomeTax";
import { usc2026 } from "@/lib/rules/ie/2026/usc";
import { credits2026 } from "@/lib/rules/ie/2026/credits";
import type { InvestmentEntry } from "@/lib/supabase/investments";

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
    assetName: "Example ordinary shares",
    symbol: "US0378331005",
    classification: "SHARE_CGT",
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
    fundTaxMethod: null,
    fundDeemedStartDate: null,
    ...overrides,
  };
}

describe("2026 ordinary-share gain matching", () => {
  it("requires a checksum-valid ISIN instead of matching ambiguous tickers", () => {
    expect(normaliseIsin("us0378331005")).toBe("US0378331005");
    expect(normaliseIsin("AAPL")).toBeNull();
    expect(normaliseIsin("US0378331004")).toBeNull();
    const [sale] = calculateShareSaleGains2026([
      trade("buy", "2025-01-01", "BUY", "1", "100", { symbol: "AAPL" }),
      trade("sell", "2026-05-01", "SELL", "1", "200", { symbol: "AAPL" }),
    ]);
    expect(sale.status).toBe("REVIEW_REQUIRED");
    expect(sale.gainEur).toBeNull();
  });

  it("matches older acquisition lots FIFO and allocates partial cost and fees", () => {
    const [sale] = calculateShareSaleGains2026([
      trade("old", "2024-01-01", "BUY", "10", "1000", { feeAmount: "10" }),
      trade("new", "2025-01-01", "BUY", "10", "2000"),
      trade("sell", "2026-08-01", "SELL", "12", "3000", { feeAmount: "12" }),
    ]);
    expect(sale.status).toBe("MATCHED");
    expect(sale.matches.map((match) => [match.purchaseId, match.quantity, match.rule])).toEqual([
      ["old", "10", "FIFO"],
      ["new", "2", "FIFO"],
    ]);
    expect(sale.costEur).toBe("1410");
    expect(sale.proceedsEur).toBe("2988");
    expect(sale.gainEur).toBe("1578");
  });

  it("uses purchases in the previous four weeks before older FIFO lots", () => {
    const [sale] = calculateShareSaleGains2026([
      trade("old", "2025-01-01", "BUY", "10", "1000"),
      trade("recent", "2026-09-01", "BUY", "5", "1000"),
      trade("sell", "2026-09-15", "SELL", "6", "1800"),
    ]);
    expect(sale.matches.map((match) => [match.purchaseId, match.rule])).toEqual([
      ["recent", "FOUR_WEEK_LIFO"],
      ["old", "FIFO"],
    ]);
    expect(sale.costEur).toBe("1100");
    expect(sale.gainEur).toBe("700");
  });

  it("consumes historical sales before matching the remaining 2026 holding", () => {
    const [sale] = calculateShareSaleGains2026([
      trade("buy", "2024-01-01", "BUY", "10", "1000"),
      trade("old-sale", "2025-01-01", "SELL", "4", "600"),
      trade("sell", "2026-08-01", "SELL", "6", "900"),
    ]);
    expect(sale.costEur).toBe("600");
    expect(sale.gainEur).toBe("300");
  });

  it("includes a purchase exactly 28 days before sale in four-week matching", () => {
    const [sale] = calculateShareSaleGains2026([
      trade("old", "2025-01-01", "BUY", "1", "100"),
      trade("boundary", "2026-01-01", "BUY", "1", "200"),
      trade("sell", "2026-01-29", "SELL", "1", "300"),
    ]);
    expect(sale.matches[0].purchaseId).toBe("boundary");
    expect(sale.matches[0].rule).toBe("FOUR_WEEK_LIFO");
  });

  it("flags losses and known repurchases rather than treating them as freely offsettable", () => {
    const [sale] = calculateShareSaleGains2026([
      trade("buy", "2025-01-01", "BUY", "10", "1000"),
      trade("sell", "2026-10-05", "SELL", "10", "500"),
      trade("repurchase", "2026-10-20", "BUY", "10", "600"),
    ]);
    expect(sale.gainEur).toBe("-500");
    expect(sale.lossRestriction).toBe("KNOWN_REPURCHASE");
    expect(sale.standardRate).toBe("0.33");
  });

  it("blocks incomplete history and uncertain same-day order", () => {
    const [missing] = calculateShareSaleGains2026([
      trade("buy", "2025-01-01", "BUY", "1", "100"),
      trade("sell", "2026-05-01", "SELL", "2", "300"),
    ]);
    expect(missing.status).toBe("REVIEW_REQUIRED");
    expect(missing.gainEur).toBeNull();

    const [sameDay] = calculateShareSaleGains2026([
      trade("buy", "2026-05-01", "BUY", "1", "100"),
      trade("sell", "2026-05-01", "SELL", "1", "200"),
    ]);
    expect(sameDay.reason).toContain("share a date");

    const [sameDayBuys] = calculateShareSaleGains2026([
      trade("buy-a", "2025-05-01", "BUY", "1", "100"),
      trade("buy-b", "2025-05-01", "BUY", "1", "200"),
      trade("sell", "2026-05-01", "SELL", "1", "300"),
    ]);
    expect(sameDayBuys.status).toBe("REVIEW_REQUIRED");
  });

  it("blocks unreviewed and unconverted trade fees", () => {
    const [unreviewed] = calculateShareSaleGains2026([
      trade("buy", "2025-01-01", "BUY", "1", "100", {
        reviewStatus: "REQUIRES_REVIEW",
      }),
      trade("sell", "2026-05-01", "SELL", "1", "200"),
    ]);
    expect(unreviewed.status).toBe("REVIEW_REQUIRED");

    const [fees] = calculateShareSaleGains2026([
      trade("buy", "2025-01-01", "BUY", "1", "100", {
        currency: "USD",
        grossAmount: "110",
        feeAmount: "1",
      }),
      trade("sell", "2026-05-01", "SELL", "1", "200"),
    ]);
    expect(fees.reason).toContain("non-EUR trade");
  });

  it("blocks conflicting classifications and pre-2003 cost bases", () => {
    const [conflict] = calculateShareSaleGains2026([
      trade("buy", "2025-01-01", "BUY", "1", "100", {
        classification: "UNKNOWN",
      }),
      trade("sell", "2026-05-01", "SELL", "1", "200"),
    ]);
    expect(conflict.status).toBe("REVIEW_REQUIRED");

    const [historic] = calculateShareSaleGains2026([
      trade("buy", "2002-01-01", "BUY", "1", "100"),
      trade("sell", "2026-05-01", "SELL", "1", "200"),
    ]);
    expect(historic.reason).toContain("pre-2003");
  });

  it("uses Revenue's 2026 year-specific bands and post-budget CGT date", () => {
    expect(incomeTax2026.singleStandardRateCutoff).toBe("44000");
    expect(incomeTax2026.personalTaxCredit).toBe("2000");
    expect(incomeTax2026.employeeTaxCreditMaximum).toBe("2000");
    expect(usc2026.bands.map((band) => [band.upTo, band.rate])).toEqual([
      ["12012", "0.005"],
      ["28700", "0.02"],
      ["70044", "0.03"],
      [null, "0.08"],
    ]);
    expect(credits2026.rentCreditMaximum).toBe("1000");
    expect(cgt2026.annualPersonalExemption).toBe("1270");
    expect(standardShareCgtRate2026("2026-10-06")).toBe("0.33");
    expect(standardShareCgtRate2026("2026-10-07")).toBe("0.31");
    expect(() => standardShareCgtRate2026("2027-01-01")).toThrow();
  });
});
