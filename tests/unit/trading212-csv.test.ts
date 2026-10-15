import { describe, expect, it } from "vitest";
import { parseTrading212Csv } from "@/lib/import/trading212";

describe("Trading 212 CSV preview", () => {
  it("parses quoted names and maps common events for review", () => {
    const csv = [
      "Action,Time,Name,Ticker,No. of shares,Total,Currency (Total),ID",
      'Market buy,2026-03-01 09:20:00,"Example, Inc",EX,1.5,-150.20,EUR,trade-1',
      "Dividend (Ordinary),2026-04-03 12:00:00,Example Inc,EX,,3.20,EUR,div-1",
    ].join("\n");
    const result = parseTrading212Csv(csv);
    expect(result.errors).toEqual([]);
    expect(result.drafts).toMatchObject([
      {
        kind: "BUY",
        assetName: "Example, Inc",
        quantity: "1.5",
        grossAmount: "150.2",
        externalId: "trade-1",
      },
      { kind: "DIVIDEND", grossAmount: "3.2", externalId: "div-1" },
    ]);
  });

  it("stops rows with missing trade quantity or ambiguous dates", () => {
    const csv = [
      "Action,Time,Total,Currency (Total)",
      "Market sell,2026-02-01,100,EUR",
      "Interest,not a date,5,EUR",
    ].join("\n");
    const result = parseTrading212Csv(csv);
    expect(result.drafts).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  it("rejects unrelated CSV layouts", () => {
    expect(() => parseTrading212Csv("name,value\nfoo,1")).toThrow("Action, Time, Total");
  });

  it("rejects comma decimals rather than changing their value", () => {
    const csv = 'Action,Time,Total,Currency (Total)\nInterest,2026-02-01,"1,23",EUR';
    const result = parseTrading212Csv(csv);
    expect(result.drafts).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("accepts earlier trades for cost-basis history but rejects later years", () => {
    const csv = [
      "Action,Time,Name,Ticker,No. of shares,Total,Currency (Total),ID",
      "Market buy,2024-05-01,Example Inc,EX,2,-100,EUR,old-buy",
      "Market sell,2025-05-01,Example Inc,EX,1,60,EUR,old-sell",
      "Market buy,2027-01-01,Example Inc,EX,1,-70,EUR,future-buy",
    ].join("\n");
    const result = parseTrading212Csv(csv);
    expect(result.drafts.map((draft) => [draft.eventDate, draft.kind])).toEqual([
      ["2024-05-01", "BUY"],
      ["2025-05-01", "SELL"],
    ]);
    expect(result.errors).toHaveLength(1);
  });

  it("prefers an ISIN over a ticker when both are exported", () => {
    const csv = [
      "Action,Time,Name,Ticker,ISIN,No. of shares,Total,Currency (Total),ID",
      "Market buy,2026-01-01,Example Inc,EX,US0378331005,1,-100,EUR,trade-1",
    ].join("\n");
    expect(parseTrading212Csv(csv).drafts[0].symbol).toBe("US0378331005");
  });
});
