import { z } from "zod";
import { normalizeDecimal } from "@/lib/validation/money";

const nonNegativeDecimal = normalizeDecimal().refine((value) => !value.startsWith("-"), {
  message: "Must be zero or greater",
});

const optionalDate = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .refine(
    (value) =>
      value === null ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))),
    { message: "Must be a valid date" },
  );

export const employmentFormSchema = z
  .object({
    employerName: z.string().trim().min(1, "Employer name is required").max(200),
    employerRegistrationNumber: z
      .string()
      .trim()
      .max(50)
      .transform((value) => (value === "" ? null : value)),
    startDate: optionalDate,
    endDate: optionalDate,
    grossPay: nonNegativeDecimal,
    payForIncomeTax: nonNegativeDecimal,
    payForUsc: nonNegativeDecimal,
    incomeTaxDeducted: nonNegativeDecimal,
    uscDeducted: nonNegativeDecimal,
    prsiDeducted: nonNegativeDecimal,
    pensionContributionsPayrollRelieved: z
      .string()
      .transform((value) => value.trim())
      .transform((value) => (value === "" ? null : value))
      .nullable()
      .pipe(nonNegativeDecimal.nullable()),
    otherDeductionAmount: z
      .string()
      .transform((value) => value.trim())
      .transform((value) => (value === "" ? null : value))
      .nullable()
      .pipe(nonNegativeDecimal.nullable()),
  })
  .refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
    path: ["endDate"],
    message: "End date must be on or after the start date",
  });

export type EmploymentFormValues = z.infer<typeof employmentFormSchema>;
