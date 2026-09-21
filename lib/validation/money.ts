import { z } from "zod";
import { isDecimalString, toDecimalString } from "@/lib/utils/decimal";

// Runtime validation helpers for canonical decimal strings (money, quantities,
// rates). Any external input destined for a money column must pass through one
// of these schemas in a server action or parser.

export const decimalStringSchema = z.string().refine(isDecimalString, {
  message: "Must be a canonical decimal string (e.g. 1234.56)",
});

export const optionalDecimalStringSchema = z
  .string()
  .refine(isDecimalString, { message: "Must be a canonical decimal string (e.g. 1234.56)" })
  .nullable()
  .optional();

/** Accepts any numeric-ish string and normalizes it to a canonical DecimalString. */
export function normalizeDecimal() {
  return z
    .string()
    .refine((v) => /^-?(?:\d+)(?:\.\d+)?$/.test(v), {
      message: "Must be a number (e.g. 1234.56 or -20.00)",
    })
    .transform((v) => toDecimalString(v));
}

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

export const isoDateTimeSchema = z.string().datetime({ offset: true });
