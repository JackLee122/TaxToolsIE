alter table public.investment_entry
  add column fund_tax_method text check (fund_tax_method in ('OFFSHORE_EQUIVALENT_FIFO')),
  add column fund_deemed_start_date date;

create table public.fund_unit_valuation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  isin text not null,
  valuation_date date not null,
  unit_value_eur text not null,
  evidence_note text not null,
  created_at timestamptz not null default now(),
  unique (user_id, isin, valuation_date)
);

create index fund_unit_valuation_user_date_idx
  on public.fund_unit_valuation (user_id, valuation_date desc);

alter table public.fund_unit_valuation enable row level security;

create policy "Owners can access their fund unit valuations"
  on public.fund_unit_valuation for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.fund_unit_valuation from anon;
grant select, insert, update, delete on public.fund_unit_valuation to authenticated;
