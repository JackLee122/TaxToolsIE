import Decimal from "decimal.js";
import { normaliseIsin } from "@/lib/domain/investments/share-gains";
import type { FundUnitValuation, InvestmentEntry } from "@/lib/supabase/investments";
import { isDecimalString, toDecimalString, type DecimalString } from "@/lib/utils/decimal";

export type FundLotMatch = {
  purchaseId: string;
  purchaseDate: string;
  quantity: DecimalString;
  costEur: DecimalString;
};

export type FundEvent = {
  id: string;
  kind: "SALE" | "EIGHT_YEAR_DEEMED";
  eventDate: string;
  assetName: string;
  isin: string;
  quantity: DecimalString;
  status: "CALCULATED" | "REVIEW_REQUIRED";
  reason: string | null;
  valueEur: DecimalString | null;
  costEur: DecimalString;
  differenceEur: DecimalString | null;
  matches: FundLotMatch[];
};

export type FundNextAnniversary = {
  purchaseId: string;
  assetName: string;
  isin: string;
  dueDate: string;
  remainingQuantity: DecimalString;
};

export type FundReviewIssue = {
  assetName: string;
  isin: string | null;
  reason: string;
};

export type FundPosition2026 = {
  events: FundEvent[];
  nextAnniversaries: FundNextAnniversary[];
  issues: FundReviewIssue[];
};

type Lot = {
  entry: InvestmentEntry;
  startDate: string;
  remainingQuantity: Decimal;
  remainingCost: Decimal;
};

function addEightYears(date: string): string | null {
  const result = `${Number(date.slice(0, 4)) + 8}${date.slice(4)}`;
  const parsed = new Date(`${result}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result
    ? result
    : null;
}

function positiveDecimal(value: string | null): value is DecimalString {
  return isDecimalString(value) && new Decimal(value).gt(0);
}

function validStart(row: InvestmentEntry): string | null {
  if (row.eventDate >= "2022-01-01") {
    return !row.fundDeemedStartDate || row.fundDeemedStartDate === row.eventDate
      ? row.eventDate
      : null;
  }
  const start = row.fundDeemedStartDate;
  if (!start || start < row.eventDate || start > "2026-12-31") return null;
  const parsed = new Date(`${start}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === start
    ? start
    : null;
}

function instrumentProblem(rows: InvestmentEntry[]): string | null {
  const dates = new Set<string>();
  for (const row of rows) {
    if (row.kind === "OTHER")
      return "A corporate action or fund switch needs manual unit and basis review.";
    if (
      row.classification !== "FUND_EXIT_TAX_38_2026" ||
      row.reviewStatus !== "CONFIRMED" ||
      row.fundTaxMethod !== "OFFSHORE_EQUIVALENT_FIFO"
    ) {
      return "Confirm every trade as an equivalent offshore fund using FIFO; Irish fund and other basis methods need separate review.";
    }
    if (dates.has(row.eventDate)) {
      return "Multiple trades share a date; the saved records do not establish their order.";
    }
    dates.add(row.eventDate);
    if (
      !positiveDecimal(row.quantity) ||
      !positiveDecimal(row.grossAmount) ||
      !positiveDecimal(row.eurAmount) ||
      !isDecimalString(row.feeAmount) ||
      new Decimal(row.feeAmount).lt(0)
    ) {
      return "A trade needs positive quantity, original and EUR gross values, and a valid fee.";
    }
    if (row.currency === "EUR" && !new Decimal(row.eurAmount).eq(row.grossAmount)) {
      return "An EUR trade's original and converted gross amounts do not agree.";
    }
    if (row.currency !== "EUR" && new Decimal(row.feeAmount).gt(0)) {
      return "A non-EUR trade has fees without a separately verified EUR fee value.";
    }
    if (row.kind === "SELL" && new Decimal(row.eurAmount).lt(row.feeAmount)) {
      return "A sale's fees exceed its recorded EUR gross proceeds.";
    }
    if (row.kind === "BUY" && !validStart(row)) {
      return "Confirm the eight-year start date for each pre-2022 purchase; transitional ETF rules can change it.";
    }
    if (row.kind === "BUY" && row.eventDate < "2001-01-01") {
      return "Pre-2001 fund holdings need manual treatment review.";
    }
  }
  return null;
}

function calculateInstrument(
  isin: string,
  rows: InvestmentEntry[],
  valuations: Map<string, FundUnitValuation>,
): FundPosition2026 {
  const problem = instrumentProblem(rows);
  if (problem) {
    return {
      events: [],
      nextAnniversaries: [],
      issues: [{ assetName: rows[0].assetName, isin, reason: problem }],
    };
  }
  const activity: {
    date: string;
    kind: "TRADE" | "DEEMED";
    entry: InvestmentEntry;
  }[] = [];
  for (const row of rows) {
    activity.push({ date: row.eventDate, kind: "TRADE", entry: row });
    if (row.kind !== "BUY") continue;
    let dueDate = addEightYears(validStart(row)!);
    if (!dueDate) {
      return {
        events: [],
        nextAnniversaries: [],
        issues: [
          { assetName: row.assetName, isin, reason: "The anniversary date needs manual review." },
        ],
      };
    }
    while (dueDate <= "2026-12-31") {
      activity.push({ date: dueDate, kind: "DEEMED", entry: row });
      dueDate = addEightYears(dueDate);
      if (!dueDate) break;
    }
  }
  const tradeDates = new Set(rows.map((row) => row.eventDate));
  if (activity.some((item) => item.kind === "DEEMED" && tradeDates.has(item.date))) {
    return {
      events: [],
      nextAnniversaries: [],
      issues: [
        {
          assetName: rows[0].assetName,
          isin,
          reason:
            "A trade occurs on an eight-year anniversary; timing and affected units need review.",
        },
      ],
    };
  }
  activity.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.kind.localeCompare(b.kind) ||
      a.entry.id.localeCompare(b.entry.id),
  );
  const lots: Lot[] = [];
  const events: FundEvent[] = [];
  for (const item of activity) {
    if (item.kind === "TRADE" && item.entry.kind === "BUY") {
      lots.push({
        entry: item.entry,
        startDate: validStart(item.entry)!,
        remainingQuantity: new Decimal(item.entry.quantity!),
        remainingCost: new Decimal(item.entry.eurAmount!).plus(item.entry.feeAmount),
      });
      continue;
    }
    if (item.kind === "DEEMED") {
      const lot = lots.find((candidate) => candidate.entry.id === item.entry.id);
      if (!lot || lot.remainingQuantity.lte(0)) continue;
      const valuation = valuations.get(`${isin}:${item.date}`);
      const validValuation = valuation && positiveDecimal(valuation.unitValueEur);
      const value = validValuation ? lot.remainingQuantity.times(valuation.unitValueEur) : null;
      events.push({
        id: `deemed:${lot.entry.id}:${item.date}`,
        kind: "EIGHT_YEAR_DEEMED",
        eventDate: item.date,
        assetName: lot.entry.assetName,
        isin,
        quantity: toDecimalString(lot.remainingQuantity),
        status: value ? "CALCULATED" : "REVIEW_REQUIRED",
        reason: value ? null : "Enter a documented EUR value per unit on this anniversary.",
        valueEur: value ? toDecimalString(value) : null,
        costEur: toDecimalString(lot.remainingCost),
        differenceEur: value ? toDecimalString(value.minus(lot.remainingCost)) : null,
        matches: [
          {
            purchaseId: lot.entry.id,
            purchaseDate: lot.entry.eventDate,
            quantity: toDecimalString(lot.remainingQuantity),
            costEur: toDecimalString(lot.remainingCost),
          },
        ],
      });
      continue;
    }
    const sale = item.entry;
    let remaining = new Decimal(sale.quantity!);
    const available = lots.reduce((sum, lot) => sum.plus(lot.remainingQuantity), new Decimal(0));
    if (available.lt(remaining)) {
      return {
        events: [],
        nextAnniversaries: [],
        issues: [
          {
            assetName: sale.assetName,
            isin,
            reason:
              "Recorded purchases do not cover all fund sales. Add the missing acquisition history.",
          },
        ],
      };
    }
    let cost = new Decimal(0);
    const matches: FundLotMatch[] = [];
    for (const lot of lots) {
      if (remaining.lte(0)) break;
      if (lot.remainingQuantity.lte(0)) continue;
      const quantity = Decimal.min(remaining, lot.remainingQuantity);
      const allocatedCost = lot.remainingCost.times(quantity).div(lot.remainingQuantity);
      lot.remainingQuantity = lot.remainingQuantity.minus(quantity);
      lot.remainingCost = lot.remainingCost.minus(allocatedCost);
      remaining = remaining.minus(quantity);
      cost = cost.plus(allocatedCost);
      matches.push({
        purchaseId: lot.entry.id,
        purchaseDate: lot.entry.eventDate,
        quantity: toDecimalString(quantity),
        costEur: toDecimalString(allocatedCost),
      });
    }
    if (!sale.eventDate.startsWith("2026-")) continue;
    const value = new Decimal(sale.eurAmount!).minus(sale.feeAmount);
    events.push({
      id: `sale:${sale.id}`,
      kind: "SALE",
      eventDate: sale.eventDate,
      assetName: sale.assetName,
      isin,
      quantity: toDecimalString(sale.quantity!),
      status: "CALCULATED",
      reason: null,
      valueEur: toDecimalString(value),
      costEur: toDecimalString(cost),
      differenceEur: toDecimalString(value.minus(cost)),
      matches,
    });
  }
  const nextAnniversaries: FundNextAnniversary[] = [];
  for (const lot of lots) {
    if (lot.remainingQuantity.lte(0)) continue;
    let dueDate = addEightYears(lot.startDate);
    while (dueDate && dueDate <= "2026-12-31") dueDate = addEightYears(dueDate);
    if (dueDate) {
      nextAnniversaries.push({
        purchaseId: lot.entry.id,
        assetName: lot.entry.assetName,
        isin,
        dueDate,
        remainingQuantity: toDecimalString(lot.remainingQuantity),
      });
    }
  }
  return { events, nextAnniversaries, issues: [] };
}

export function calculateFundPosition2026(
  entries: InvestmentEntry[],
  valuations: FundUnitValuation[],
): FundPosition2026 {
  const byIsin = new Map<string, InvestmentEntry[]>();
  const issues: FundReviewIssue[] = [];
  for (const entry of entries) {
    if (entry.kind !== "BUY" && entry.kind !== "SELL" && entry.kind !== "OTHER") continue;
    const isin = normaliseIsin(entry.symbol);
    if (!isin) {
      if (
        entry.classification === "FUND_EXIT_TAX_38_2026" &&
        (entry.kind === "BUY" || entry.kind === "SELL")
      ) {
        issues.push({
          assetName: entry.assetName,
          isin: null,
          reason: `${entry.eventDate}: add a valid ISIN to match fund units safely.`,
        });
      }
      continue;
    }
    const rows = byIsin.get(isin) ?? [];
    rows.push(entry);
    byIsin.set(isin, rows);
  }
  const valuationMap = new Map(valuations.map((row) => [`${row.isin}:${row.valuationDate}`, row]));
  const events: FundEvent[] = [];
  const nextAnniversaries: FundNextAnniversary[] = [];
  for (const [isin, rows] of byIsin) {
    if (!rows.some((row) => row.classification === "FUND_EXIT_TAX_38_2026")) continue;
    const position = calculateInstrument(isin, rows, valuationMap);
    events.push(...position.events);
    nextAnniversaries.push(...position.nextAnniversaries);
    issues.push(...position.issues);
  }
  events.sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.id.localeCompare(b.id));
  nextAnniversaries.sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.purchaseId.localeCompare(b.purchaseId),
  );
  return { events, nextAnniversaries, issues };
}
