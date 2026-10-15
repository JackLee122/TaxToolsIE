import Decimal from "decimal.js";
import type { InvestmentEntry } from "@/lib/supabase/investments";
import { cgt2026, standardShareCgtRate2026 } from "@/lib/rules/ie/2026/cgt";
import { isDecimalString, toDecimalString, type DecimalString } from "@/lib/utils/decimal";

export type ShareLotMatch = {
  purchaseId: string;
  purchaseDate: string;
  quantity: DecimalString;
  costEur: DecimalString;
  rule: "FOUR_WEEK_LIFO" | "FIFO";
};

export type ShareSaleGain = {
  saleId: string;
  saleDate: string;
  assetName: string;
  isin: string | null;
  standardRate: string;
  status: "MATCHED" | "REVIEW_REQUIRED";
  reason: string | null;
  proceedsEur: DecimalString | null;
  costEur: DecimalString | null;
  gainEur: DecimalString | null;
  lossRestriction: "NOT_APPLICABLE" | "KNOWN_REPURCHASE" | "REVIEW_REQUIRED";
  matches: ShareLotMatch[];
};

type Lot = {
  entry: InvestmentEntry;
  remainingQuantity: Decimal;
  remainingCost: Decimal;
};

const DAY_MS = 86_400_000;

function dayDifference(earlier: string, later: string): number {
  return (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / DAY_MS;
}

/** An ISIN avoids silently pooling different share classes or similarly named tickers. */
export function normaliseIsin(value: string | null): string | null {
  const isin = value?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return null;
  const digits = [...isin]
    .map((character) =>
      /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character,
    )
    .join("");
  let sum = 0;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const positionFromRight = digits.length - 1 - index;
    let value = Number(digits[index]);
    if (positionFromRight % 2 === 1) value *= 2;
    sum += value > 9 ? value - 9 : value;
  }
  return sum % 10 === 0 ? isin : null;
}

function blocked(sale: InvestmentEntry, reason: string): ShareSaleGain {
  return {
    saleId: sale.id,
    saleDate: sale.eventDate,
    assetName: sale.assetName,
    isin: normaliseIsin(sale.symbol),
    standardRate: standardShareCgtRate2026(sale.eventDate),
    status: "REVIEW_REQUIRED",
    reason,
    proceedsEur: null,
    costEur: null,
    gainEur: null,
    lossRestriction: "NOT_APPLICABLE",
    matches: [],
  };
}

function tradeProblem(rows: InvestmentEntry[]): string | null {
  const dates = new Map<string, string[]>();
  for (const row of rows) {
    if (row.kind === "OTHER") return "A corporate action or other event needs manual basis review.";
    if (row.classification !== "SHARE_CGT" || row.reviewStatus !== "CONFIRMED") {
      return "Confirm the tax treatment and values for every trade in this ISIN's history.";
    }
    if (
      !row.quantity ||
      !isDecimalString(row.quantity) ||
      new Decimal(row.quantity).lte(0) ||
      !isDecimalString(row.grossAmount) ||
      new Decimal(row.grossAmount).lte(0) ||
      !isDecimalString(row.feeAmount) ||
      new Decimal(row.feeAmount).lt(0)
    ) {
      return "A trade has a missing or invalid quantity, gross amount or fee.";
    }
    if (!row.eurAmount || !isDecimalString(row.eurAmount) || new Decimal(row.eurAmount).lte(0)) {
      return "Confirm the event-date EUR gross amount for every trade.";
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
    if (row.kind === "BUY" && row.eventDate < "2003-01-01") {
      return "A pre-2003 acquisition needs manual indexation and cost-basis review.";
    }
    const kinds = dates.get(row.eventDate) ?? [];
    kinds.push(row.kind);
    dates.set(row.eventDate, kinds);
  }
  if ([...dates.values()].some((kinds) => kinds.length > 1)) {
    return "Multiple trades share a date; the saved records do not establish their order.";
  }
  return null;
}

function matchInstrument(rows: InvestmentEntry[]): ShareSaleGain[] {
  const targetSales = rows.filter(
    (row) => row.kind === "SELL" && row.eventDate.startsWith("2026-"),
  );
  const problem = tradeProblem(rows);
  if (problem) return targetSales.map((sale) => blocked(sale, problem));

  const lots: Lot[] = [];
  const results: ShareSaleGain[] = [];
  const chronological = [...rows].sort(
    (a, b) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id),
  );
  for (const row of chronological) {
    if (row.kind === "BUY") {
      lots.push({
        entry: row,
        remainingQuantity: new Decimal(row.quantity!),
        remainingCost: new Decimal(row.eurAmount!).plus(row.feeAmount),
      });
      continue;
    }
    if (row.kind !== "SELL") continue;
    const quantity = new Decimal(row.quantity!);
    if (
      lots.reduce((total, lot) => total.plus(lot.remainingQuantity), new Decimal(0)).lt(quantity)
    ) {
      return targetSales.map((sale) =>
        blocked(
          sale,
          "Recorded purchases do not cover all sales. Add the missing acquisition history.",
        ),
      );
    }
    let remaining = quantity;
    let cost = new Decimal(0);
    const matches: ShareLotMatch[] = [];
    const recent = lots
      .filter(
        (lot) =>
          lot.remainingQuantity.gt(0) &&
          dayDifference(lot.entry.eventDate, row.eventDate) <= cgt2026.shareMatchingWindowDays,
      )
      .sort(
        (a, b) =>
          b.entry.eventDate.localeCompare(a.entry.eventDate) ||
          b.entry.id.localeCompare(a.entry.id),
      );
    const older = lots.filter((lot) => lot.remainingQuantity.gt(0) && !recent.includes(lot));
    for (const lot of [...recent, ...older]) {
      if (remaining.lte(0)) break;
      const take = Decimal.min(remaining, lot.remainingQuantity);
      const allocatedCost = lot.remainingCost.times(take).div(lot.remainingQuantity);
      lot.remainingQuantity = lot.remainingQuantity.minus(take);
      lot.remainingCost = lot.remainingCost.minus(allocatedCost);
      remaining = remaining.minus(take);
      cost = cost.plus(allocatedCost);
      matches.push({
        purchaseId: lot.entry.id,
        purchaseDate: lot.entry.eventDate,
        quantity: toDecimalString(take),
        costEur: toDecimalString(allocatedCost),
        rule: recent.includes(lot) ? "FOUR_WEEK_LIFO" : "FIFO",
      });
    }
    if (!row.eventDate.startsWith("2026-")) continue;
    const proceeds = new Decimal(row.eurAmount!).minus(row.feeAmount);
    const gain = proceeds.minus(cost);
    const knownRepurchase =
      gain.lt(0) &&
      chronological.some(
        (candidate) =>
          candidate.kind === "BUY" &&
          dayDifference(row.eventDate, candidate.eventDate) > 0 &&
          dayDifference(row.eventDate, candidate.eventDate) <= cgt2026.shareMatchingWindowDays,
      );
    results.push({
      saleId: row.id,
      saleDate: row.eventDate,
      assetName: row.assetName,
      isin: normaliseIsin(row.symbol),
      standardRate: standardShareCgtRate2026(row.eventDate),
      status: "MATCHED",
      reason: null,
      proceedsEur: toDecimalString(proceeds),
      costEur: toDecimalString(cost),
      gainEur: toDecimalString(gain),
      lossRestriction: gain.gte(0)
        ? "NOT_APPLICABLE"
        : knownRepurchase
          ? "KNOWN_REPURCHASE"
          : "REVIEW_REQUIRED",
      matches,
    });
  }
  return results;
}

export function calculateShareSaleGains2026(entries: InvestmentEntry[]): ShareSaleGain[] {
  const targetSales = entries.filter(
    (entry) =>
      entry.kind === "SELL" &&
      entry.classification === "SHARE_CGT" &&
      entry.eventDate.startsWith("2026-"),
  );
  const byIsin = new Map<string, InvestmentEntry[]>();
  for (const entry of entries) {
    if (entry.kind !== "BUY" && entry.kind !== "SELL" && entry.kind !== "OTHER") continue;
    const isin = normaliseIsin(entry.symbol);
    if (!isin) continue;
    const rows = byIsin.get(isin) ?? [];
    rows.push(entry);
    byIsin.set(isin, rows);
  }
  const matched = new Map<string, ShareSaleGain>();
  for (const rows of byIsin.values()) {
    for (const result of matchInstrument(rows)) matched.set(result.saleId, result);
  }
  return targetSales
    .map(
      (sale) =>
        matched.get(sale.id) ??
        blocked(sale, "Add a valid ISIN so purchases and sales can be matched safely."),
    )
    .sort((a, b) => b.saleDate.localeCompare(a.saleDate) || a.saleId.localeCompare(b.saleId));
}
