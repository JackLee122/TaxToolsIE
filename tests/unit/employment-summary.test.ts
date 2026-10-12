import { describe, expect, it } from "vitest";
import {
  calculateEmploymentTaxSummary,
  sumEmploymentRecords,
} from "@/lib/domain/employment/summary";
import { employmentFormSchema } from "@/lib/domain/employment/validation";
import type { EmploymentRecordRow } from "@/lib/db/repositories/employment";

const record = (overrides: Partial<EmploymentRecordRow> = {}): EmploymentRecordRow => ({
  id: "employment-1",
  taxYear: 2026,
  employerName: "Example Ltd",
  employerRegistrationNumber: null,
  startDate: "2026-01-01",
  endDate: null,
  grossPay: "50000",
  payForIncomeTax: "48000",
  payForUsc: "50000",
  incomeTaxDeducted: "7000",
  uscDeducted: "1200",
  prsiDeducted: "2000",
  pensionContributionsPayrollRelieved: "2000",
  otherDeductionAmount: null,
  source: "MANUAL",
  sourceDocumentId: null,
  verifiedByUser: true,
  ...overrides,
});

describe("employment validation", () => {
  const validInput = {
    employerName: " Example Ltd ",
    employerRegistrationNumber: "",
    startDate: "2026-01-01",
    endDate: "",
    grossPay: "50000.00",
    payForIncomeTax: "48000",
    payForUsc: "50000",
    incomeTaxDeducted: "7000",
    uscDeducted: "1200",
    prsiDeducted: "2000",
    pensionContributionsPayrollRelieved: "2000",
    otherDeductionAmount: "",
  };

  it("normalizes money and blank optional fields before persistence", () => {
    const result = employmentFormSchema.parse(validInput);
    expect(result.grossPay).toBe("50000");
    expect(result.employerName).toBe("Example Ltd");
    expect(result.employerRegistrationNumber).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.otherDeductionAmount).toBeNull();
  });

  it("rejects negative amounts and inverted employment dates", () => {
    expect(employmentFormSchema.safeParse({ ...validInput, uscDeducted: "-1" }).success).toBe(
      false,
    );
    expect(employmentFormSchema.safeParse({ ...validInput, endDate: "2025-12-31" }).success).toBe(
      false,
    );
  });
});

describe("employment annual summary", () => {
  it("adds multiple employer records using decimal arithmetic", () => {
    const totals = sumEmploymentRecords([
      record(),
      record({
        id: "employment-2",
        grossPay: "0.10",
        payForIncomeTax: "0.10",
        payForUsc: "0.10",
        incomeTaxDeducted: "0.10",
        uscDeducted: "0.10",
        prsiDeducted: "0.10",
        pensionContributionsPayrollRelieved: null,
      }),
    ]);
    expect(totals.grossPay).toBe("50000.1");
    expect(totals.incomeTaxDeducted).toBe("7000.1");
    expect(totals.pensionContributionsPayrollRelieved).toBe("2000");
  });

  it("does not deduct payroll-relieved pension contributions twice", () => {
    const summary = calculateEmploymentTaxSummary(2026, [record()], true);
    expect(summary.incomeTax.taxableIncome).toBe("48000");
    expect(summary.totals.pensionContributionsPayrollRelieved).toBe("2000");
    expect(summary.position.employmentIncomeEur).toBe("48000");
    expect(summary.position.finalEstimateStatus).toBe("COMPLETE");
  });
});
