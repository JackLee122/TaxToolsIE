alter table public.tax_profile add column main_income_paye boolean not null default false;
alter table public.tax_profile add column has_self_employment boolean not null default false;
alter table public.tax_profile add column has_rental_income boolean not null default false;

create table public.credit_claim (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  type text not null check (type in ('RENT_TAX_CREDIT', 'HEALTH_EXPENSE_RELIEF', 'TUITION_FEE_RELIEF', 'PENSION_RELIEF', 'FLAT_RATE_EXPENSE')),
  input_amount text not null,
  eligible_amount text not null,
  estimated_tax_value text not null,
  status text not null check (status in ('USER_CONFIRMED', 'POTENTIALLY_ELIGIBLE', 'ALREADY_CLAIMED')),
  evidence_note text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index credit_claim_user_year_idx on public.credit_claim (user_id, tax_year);
create unique index credit_claim_annual_single_idx on public.credit_claim (user_id, tax_year, type)
  where type in ('RENT_TAX_CREDIT', 'TUITION_FEE_RELIEF');

create table public.import_batch (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  file_name text not null,
  created_at timestamptz not null default now(),
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  review_count integer not null default 0,
  error_count integer not null default 0
);

create index import_batch_user_created_idx on public.import_batch (user_id, created_at desc);

create table public.investment_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  event_date date not null,
  kind text not null check (kind in ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'OTHER')),
  asset_name text not null,
  symbol text,
  classification text not null check (classification in ('SHARE_CGT', 'FUND_EXIT_TAX_38_2026', 'UNKNOWN', 'UNSUPPORTED')),
  quantity text,
  gross_amount text not null,
  fee_amount text not null default '0',
  withholding_amount text not null default '0',
  currency text not null,
  eur_amount text,
  income_jurisdiction text,
  interest_source_type text,
  source text not null check (source in ('MANUAL', 'TRADING_212_CSV')),
  external_id text,
  import_batch_id uuid references public.import_batch(id) on delete set null,
  review_status text not null check (review_status in ('CONFIRMED', 'REQUIRES_REVIEW')),
  note text,
  created_at timestamptz not null default now()
);

create index investment_entry_user_year_idx on public.investment_entry (user_id, tax_year, event_date desc);
create unique index investment_entry_external_unique on public.investment_entry (user_id, source, external_id) where external_id is not null;

alter table public.credit_claim enable row level security;
alter table public.import_batch enable row level security;
alter table public.investment_entry enable row level security;

create policy "Owners can access their credit claims"
  on public.credit_claim for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can access their import batches"
  on public.import_batch for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can access their investment entries"
  on public.investment_entry for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.credit_claim, public.import_batch, public.investment_entry from anon;
grant select, insert, update, delete on public.credit_claim, public.import_batch, public.investment_entry to authenticated;
