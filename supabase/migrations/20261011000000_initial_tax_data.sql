create table public.tax_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  residence_status text not null,
  domicile_status text not null,
  assessment_status text not null,
  date_of_birth text,
  student_status boolean not null default false,
  full_time_student boolean,
  unemployed_at_year_end boolean not null default false,
  unemployment_start_date text,
  receives_taxable_social_welfare boolean not null default false,
  calculation_status text not null,
  constraint tax_profile_user_year_unique unique (user_id, tax_year)
);

create table public.employment_record (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  employer_name text not null,
  employer_registration_number text,
  start_date text,
  end_date text,
  gross_pay text not null,
  pay_for_income_tax text not null,
  pay_for_usc text not null,
  income_tax_deducted text not null,
  usc_deducted text not null,
  prsi_deducted text not null,
  pension_contributions_payroll_relieved text,
  other_deduction_amount text,
  source text not null,
  source_document_id text,
  verified_by_user boolean not null default false
);

create index employment_record_user_year_idx on public.employment_record (user_id, tax_year);

alter table public.tax_profile enable row level security;
alter table public.employment_record enable row level security;

create policy "Owners can access their tax profiles"
  on public.tax_profile for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can access their employment records"
  on public.employment_record for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.tax_profile, public.employment_record from anon;
grant select, insert, update, delete on public.tax_profile, public.employment_record to authenticated;
