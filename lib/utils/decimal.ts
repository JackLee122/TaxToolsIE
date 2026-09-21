import Decimal from "decimal.js";

// Canonical decimal-string type for all persisted money/quantity/rate values.
// JavaScript number arithmetic is forbidden for tax and investment math.
// Database drivers return TEXT values as ordinary strings, so the type remains
// assignable from `string`. Canonical form is enforced at every external input
// boundary by `isDecimalString`/Zod, and by this module when performing maths.
export type DecimalString = string;

// Integer-decimal canonical form: `0`, `-1.25`, `1234.56`. No exponent
// notation, no thousands separators, no leading/trailing zeros beyond the
// point kept by the source value.
const DECIMAL_STRING_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

// Arbitrary precision for intermediate money math. Rounds only inside explicit
// output helpers, never in the calculation pipeline.
Decimal.set({ precision: 60, rounding: Decimal.ROUND_HALF_UP });

export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === "string" && DECIMAL_STRING_RE.test(value);
}

/** Build a canonical DecimalString from any decimal.js-compatible value. */
export function toDecimalString(value: Decimal.Value): DecimalString {
  return new Decimal(value).toDecimalPlaces(40).toString() as DecimalString;
}

/** Alias used when normalizing externally-supplied strings. */
export function canonicalize(value: string): DecimalString {
  return toDecimalString(value);
}

export function d(value: DecimalString): Decimal {
  return new Decimal(value);
}

export const add = (a: DecimalString, b: DecimalString): DecimalString =>
  toDecimalString(d(a).plus(d(b)));
export const sub = (a: DecimalString, b: DecimalString): DecimalString =>
  toDecimalString(d(a).minus(d(b)));
export const mul = (a: DecimalString, b: Decimal.Value): DecimalString =>
  toDecimalString(d(a).times(b));

export function ratio(
  percent: DecimalString,
  num: DecimalString,
  den: DecimalString,
): DecimalString {
  return toDecimalString(d(num).div(d(den)).times(d(percent)));
}

export const gt = (a: DecimalString, b: DecimalString): boolean => d(a).gt(d(b));
export const gte = (a: DecimalString, b: DecimalString): boolean => d(a).gte(d(b));
export const lt = (a: DecimalString, b: DecimalString): boolean => d(a).lt(d(b));
export const lte = (a: DecimalString, b: DecimalString): boolean => d(a).lte(d(b));
export const eq = (a: DecimalString, b: DecimalString): boolean => d(a).eq(d(b));
export const isZero = (a: DecimalString): boolean => d(a).isZero();

export const max = (a: DecimalString, b: DecimalString): DecimalString => (d(a).gte(d(b)) ? a : b);
export const min = (a: DecimalString, b: DecimalString): DecimalString => (d(a).lte(d(b)) ? a : b);

/**
 * Round a DecimalString to a given number of decimal places. This is an
 * explicit output boundary; call it only when the plan requires display/entry
 * rounding, never to fudge an intermediate calculation.
 */
export function round(value: DecimalString, places: number): DecimalString {
  return new Decimal(value)
    .toDecimalPlaces(places, Decimal.ROUND_HALF_UP)
    .toString() as DecimalString;
}

/**
 * Format a DecimalString as EUR for display. String-based so no float ever
 * touches the figure.
 */
export function formatEur(value: DecimalString): string {
  return formatMoney(value, "EUR");
}

function formatMoney(value: DecimalString, currency: "EUR" | "USD" | "GBP"): string {
  const dec = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const negative = dec.isNegative() && !dec.isZero();
  const [int, frac] = dec.abs().toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const symbol = { EUR: "€", USD: "$", GBP: "£" }[currency];
  return `${negative ? "-" : ""}${symbol}${grouped}.${frac}`;
}

export const ZERO: DecimalString = "0";
export const ONE: DecimalString = "1";
