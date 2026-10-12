import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmploymentRecordRow } from "@/lib/db/repositories/employment";
import type { TaxProfileRecord } from "@/lib/db/repositories/tax-profile";

type ProfileRow = {
  id: string;
  tax_year: number;
  residence_status: TaxProfileRecord["residenceStatus"];
  domicile_status: TaxProfileRecord["domicileStatus"];
  assessment_status: TaxProfileRecord["assessmentStatus"];
  date_of_birth: string | null;
  student_status: boolean;
  full_time_student: boolean | null;
  unemployed_at_year_end: boolean;
  unemployment_start_date: string | null;
  receives_taxable_social_welfare: boolean;
  calculation_status: TaxProfileRecord["calculationStatus"];
  main_income_paye?: boolean;
  has_self_employment?: boolean;
  has_rental_income?: boolean;
};

export type StoredTaxProfile = TaxProfileRecord & {
  mainIncomePaye: boolean;
  hasSelfEmployment: boolean;
  hasRentalIncome: boolean;
};

type EmploymentRow = {
  id: string;
  tax_year: number;
  employer_name: string;
  employer_registration_number: string | null;
  start_date: string | null;
  end_date: string | null;
  gross_pay: string;
  pay_for_income_tax: string;
  pay_for_usc: string;
  income_tax_deducted: string;
  usc_deducted: string;
  prsi_deducted: string;
  pension_contributions_payroll_relieved: string | null;
  other_deduction_amount: string | null;
  source: EmploymentRecordRow["source"];
  source_document_id: string | null;
  verified_by_user: boolean;
};

function profileFromRow(row: ProfileRow): StoredTaxProfile {
  return {
    id: row.id,
    taxYear: row.tax_year,
    residenceStatus: row.residence_status,
    domicileStatus: row.domicile_status,
    assessmentStatus: row.assessment_status,
    dateOfBirth: row.date_of_birth,
    studentStatus: row.student_status,
    fullTimeStudent: row.full_time_student,
    unemployedAtYearEnd: row.unemployed_at_year_end,
    unemploymentStartDate: row.unemployment_start_date,
    receivesTaxableSocialWelfare: row.receives_taxable_social_welfare,
    calculationStatus: row.calculation_status,
    mainIncomePaye: row.main_income_paye ?? false,
    hasSelfEmployment: row.has_self_employment ?? false,
    hasRentalIncome: row.has_rental_income ?? false,
  };
}

function employmentFromRow(row: EmploymentRow): EmploymentRecordRow {
  return {
    id: row.id,
    taxYear: row.tax_year,
    employerName: row.employer_name,
    employerRegistrationNumber: row.employer_registration_number,
    startDate: row.start_date,
    endDate: row.end_date,
    grossPay: row.gross_pay,
    payForIncomeTax: row.pay_for_income_tax,
    payForUsc: row.pay_for_usc,
    incomeTaxDeducted: row.income_tax_deducted,
    uscDeducted: row.usc_deducted,
    prsiDeducted: row.prsi_deducted,
    pensionContributionsPayrollRelieved: row.pension_contributions_payroll_relieved,
    otherDeductionAmount: row.other_deduction_amount,
    source: row.source,
    sourceDocumentId: row.source_document_id,
    verifiedByUser: row.verified_by_user,
  };
}

export async function getProfile(supabase: SupabaseClient, userId: string, taxYear: number) {
  const { data, error } = await supabase
    .from("tax_profile")
    .select("*")
    .eq("user_id", userId)
    .eq("tax_year", taxYear)
    .maybeSingle();
  if (error) throw new Error("Could not load tax profile");
  return data ? profileFromRow(data as ProfileRow) : undefined;
}

export async function createProfile(supabase: SupabaseClient, userId: string, taxYear: number) {
  const { error } = await supabase.from("tax_profile").upsert(
    {
      user_id: userId,
      tax_year: taxYear,
      residence_status: "IRISH_RESIDENT",
      domicile_status: "IRISH_DOMICILED",
      assessment_status: "SINGLE_INDIVIDUAL",
      student_status: false,
      unemployed_at_year_end: false,
      receives_taxable_social_welfare: false,
      calculation_status: "PARTIAL",
    },
    { onConflict: "user_id,tax_year", ignoreDuplicates: true },
  );
  if (error) throw new Error("Could not create tax profile");
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  taxYear: number,
  input: {
    residenceStatus: TaxProfileRecord["residenceStatus"];
    domicileStatus: TaxProfileRecord["domicileStatus"];
    assessmentStatus: TaxProfileRecord["assessmentStatus"];
    mainIncomePaye: boolean;
    hasSelfEmployment: boolean;
    hasRentalIncome: boolean;
    dateOfBirth: string | null;
    unemployedAtYearEnd: boolean;
    unemploymentStartDate: string | null;
    receivesTaxableSocialWelfare: boolean;
  },
) {
  const supported =
    input.residenceStatus === "IRISH_RESIDENT" &&
    input.domicileStatus === "IRISH_DOMICILED" &&
    input.assessmentStatus === "SINGLE_INDIVIDUAL" &&
    input.mainIncomePaye &&
    !input.hasSelfEmployment &&
    !input.hasRentalIncome;
  const { error } = await supabase.from("tax_profile").upsert(
    {
      user_id: userId,
      tax_year: taxYear,
      residence_status: input.residenceStatus,
      domicile_status: input.domicileStatus,
      assessment_status: input.assessmentStatus,
      main_income_paye: input.mainIncomePaye,
      has_self_employment: input.hasSelfEmployment,
      has_rental_income: input.hasRentalIncome,
      date_of_birth: input.dateOfBirth,
      unemployed_at_year_end: input.unemployedAtYearEnd,
      unemployment_start_date: input.unemploymentStartDate,
      receives_taxable_social_welfare: input.receivesTaxableSocialWelfare,
      calculation_status: supported ? "SUPPORTED" : "UNSUPPORTED",
    },
    { onConflict: "user_id,tax_year" },
  );
  if (error) throw new Error("Could not save tax profile");
}

export async function listEmployment(supabase: SupabaseClient, userId: string, taxYear: number) {
  const { data, error } = await supabase
    .from("employment_record")
    .select("*")
    .eq("user_id", userId)
    .eq("tax_year", taxYear)
    .order("employer_name");
  if (error) throw new Error("Could not load employment records");
  return (data as EmploymentRow[]).map(employmentFromRow);
}

export async function getEmployment(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("employment_record")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load employment record");
  return data ? employmentFromRow(data as EmploymentRow) : undefined;
}

export async function saveEmployment(
  supabase: SupabaseClient,
  userId: string,
  id: string | null,
  value: Omit<EmploymentRecordRow, "id">,
) {
  const row = {
    tax_year: value.taxYear,
    employer_name: value.employerName,
    employer_registration_number: value.employerRegistrationNumber,
    start_date: value.startDate,
    end_date: value.endDate,
    gross_pay: value.grossPay,
    pay_for_income_tax: value.payForIncomeTax,
    pay_for_usc: value.payForUsc,
    income_tax_deducted: value.incomeTaxDeducted,
    usc_deducted: value.uscDeducted,
    prsi_deducted: value.prsiDeducted,
    pension_contributions_payroll_relieved: value.pensionContributionsPayrollRelieved,
    other_deduction_amount: value.otherDeductionAmount,
    source: value.source,
    source_document_id: value.sourceDocumentId,
    verified_by_user: value.verifiedByUser,
  };
  if (id) {
    const { data, error } = await supabase
      .from("employment_record")
      .update(row)
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("Could not update employment record");
  } else {
    const { error } = await supabase.from("employment_record").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      ...row,
    });
    if (error) throw new Error("Could not add employment record");
  }
}

export async function deleteEmployment(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase
    .from("employment_record")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error("Could not delete employment record");
}
