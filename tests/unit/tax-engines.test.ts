import { describe, expect, it } from "vitest";
import {
  calculateHealthRelief2026,
  calculatePensionRelief2026,
  calculateRentCredit2026,
  calculateTuitionRelief2026,
} from "@/lib/domain/tax/credits";
import { calculateIncomeTax2026 } from "@/lib/domain/tax/income-tax";
import { calculateUsc2026 } from "@/lib/domain/tax/usc";
import { classifyFilingRoute, unemploymentClaimGuidance } from "@/lib/domain/filing/guidance";

const incomeInput = (overrides: Partial<Parameters<typeof calculateIncomeTax2026>[0]> = {}) => ({
  payeTaxableIncome: "0" as const,
  dividendIncome: "0" as const,
  additionalTaxableIncome: "0" as const,
  relievablePensionDeductions: "0" as const,
  preTaxDeductions: "0" as const,
  additionalCredits: "0" as const,
  incomeTaxAlreadyPaid: "0" as const,
  ...overrides,
});

const uscInput = (overrides: Partial<Parameters<typeof calculateUsc2026>[0]> = {}) => ({
  payeUscLiableIncome: "0" as const,
  dividendIncome: "0" as const,
  additionalUscLiableIncome: "0" as const,
  uscAlreadyPaid: "0" as const,
  ...overrides,
});

describe("2026 Income Tax", () => {
  it("does not create a liability at zero income", () => {
    expect(calculateIncomeTax2026(incomeInput()).estimatedIncomeTaxLiability).toBe("0");
  });

  it("caps the employee credit at 20% of PAYE income below €10,000", () => {
    const result = calculateIncomeTax2026(incomeInput({ payeTaxableIncome: "5000" }));
    expect(result.employeeTaxCredit).toBe("1000");
    expect(result.estimatedIncomeTaxLiability).toBe("0");
  });

  it("grants the full employee credit at the €10,000 boundary", () => {
    expect(
      calculateIncomeTax2026(incomeInput({ payeTaxableIncome: "10000" })).employeeTaxCredit,
    ).toBe("2000");
  });

  it("applies the higher rate only above the €44,000 standard-rate band", () => {
    const atBoundary = calculateIncomeTax2026(incomeInput({ payeTaxableIncome: "44000" }));
    const aboveBoundary = calculateIncomeTax2026(incomeInput({ payeTaxableIncome: "45000" }));
    expect(atBoundary.higherRateIncome).toBe("0");
    expect(atBoundary.estimatedIncomeTaxLiability).toBe("4800");
    expect(aboveBoundary.higherRateIncome).toBe("1000");
    expect(aboveBoundary.estimatedIncomeTaxLiability).toBe("5200");
  });

  it("includes dividends in taxable income and never lets credits make tax negative", () => {
    const result = calculateIncomeTax2026(
      incomeInput({
        payeTaxableIncome: "43000",
        dividendIncome: "5000",
        additionalCredits: "99999",
      }),
    );
    expect(result.higherRateIncome).toBe("4000");
    expect(result.estimatedIncomeTaxLiability).toBe("0");
    expect(result.unusedCredits).not.toBe("0");
  });
});

describe("2026 USC", () => {
  it("exempts income at and below €13,000", () => {
    expect(calculateUsc2026(uscInput({ payeUscLiableIncome: "13000" })).estimatedUscLiability).toBe(
      "0",
    );
  });

  it("charges all bands once income exceeds the exemption threshold", () => {
    const result = calculateUsc2026(uscInput({ payeUscLiableIncome: "13000.01" }));
    expect(result.exempt).toBe(false);
    expect(result.estimatedUscLiability).toBe("79.8202");
  });

  it("uses every published band at the upper boundaries", () => {
    expect(calculateUsc2026(uscInput({ payeUscLiableIncome: "28700" })).estimatedUscLiability).toBe(
      "393.82",
    );
    expect(calculateUsc2026(uscInput({ payeUscLiableIncome: "70044" })).estimatedUscLiability).toBe(
      "1634.14",
    );
  });

  it("includes dividends only when explicitly supplied as USC-liable income", () => {
    const result = calculateUsc2026(
      uscInput({ payeUscLiableIncome: "12000", dividendIncome: "2000" }),
    );
    expect(result.uscLiableIncome).toBe("14000");
    expect(result.estimatedUscLiability).toBe("99.82");
  });
});

describe("supported claims and filing guidance", () => {
  it("keeps rent claims out until required eligibility confirmations are supplied", () => {
    expect(
      calculateRentCredit2026({
        rentPaid: "6000",
        utilitiesAndServices: "0",
        eligibleUseConfirmed: true,
        unrelatedLandlordConfirmed: false,
        tenancyConfirmed: true,
      }).estimatedTaxValue,
    ).toBe("0");
    expect(
      calculateRentCredit2026({
        rentPaid: "6000",
        utilitiesAndServices: "0",
        eligibleUseConfirmed: true,
        unrelatedLandlordConfirmed: true,
        tenancyConfirmed: true,
      }).estimatedTaxValue,
    ).toBe("1000");
  });

  it("calculates basic health and tuition relief without classifying expenses itself", () => {
    expect(calculateHealthRelief2026("500", "100", true).estimatedTaxValue).toBe("80");
    expect(
      calculateTuitionRelief2026({ qualifyingFees: "7000", fullTimeApprovedCourseConfirmed: true })
        .estimatedTaxValue,
    ).toBe("800");
  });

  it("prevents pension relief from being counted twice", () => {
    expect(
      calculatePensionRelief2026({
        age: 28,
        relevantEarnings: "60000",
        employeeContribution: "10000",
        alreadyRelievedThroughPayroll: false,
      }).eligibleAmount,
    ).toBe("9000");
    expect(
      calculatePensionRelief2026({
        age: 28,
        relevantEarnings: "60000",
        employeeContribution: "10000",
        alreadyRelievedThroughPayroll: true,
      }).eligibleAmount,
    ).toBe("0");
  });

  it("holds the unverified €5,000 filing boundary for review", () => {
    expect(
      classifyFilingRoute({ taxableNonPayeIncomeEur: "4999.99", grossNonPayeIncomeEur: "30000" }),
    ).toBe("MYACCOUNT_PAYE_RETURN");
    expect(
      classifyFilingRoute({ taxableNonPayeIncomeEur: "5000", grossNonPayeIncomeEur: "0" }),
    ).toBe("SELF_ASSESSMENT_REVIEW_REQUIRED");
    expect(
      classifyFilingRoute({ taxableNonPayeIncomeEur: "5000.01", grossNonPayeIncomeEur: "0" }),
    ).toBe("SELF_ASSESSMENT_FORM_11");
  });

  it("applies the four-week and eight-week unemployment guidance", () => {
    expect(
      unemploymentClaimGuidance({
        employmentEndDate: "2026-08-31",
        emergencyTaxApplied: false,
        leavingIrelandPermanently: false,
        hasOtherTaxableIncome: false,
        receivesTaxableSocialWelfare: false,
      }).earliestClaimDate,
    ).toBe("2026-09-28");
    expect(
      unemploymentClaimGuidance({
        employmentEndDate: "2026-08-31",
        emergencyTaxApplied: false,
        leavingIrelandPermanently: false,
        hasOtherTaxableIncome: true,
        receivesTaxableSocialWelfare: false,
      }).earliestClaimDate,
    ).toBe("2026-10-26");
  });
});
