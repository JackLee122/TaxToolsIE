# TaxToolsIE

An Irish Personal Tax Dashboard for recording 2026 PAYE employment, estimating
Income Tax and USC, reviewing supported credits and reliefs, and keeping
investment records in one private workspace.

**Current scope:** manual employment and investment entry, supported basic
credit estimates, Trading 212 CSV preview and import, and provisional Revenue
filing guidance. CGT and fund/ETF tax calculations, Revenue PDF import, broker
API sync, and a complete filing audit trail are not available yet.
The full MVP specification lives in `docs/irish_tax_dashboard_mvp_implementation_plan.md`.

## Non-negotiable product rules

- No LLM in the tax path. All calculations are deterministic and unit-tested.
- No Revenue filing, no Revenue login, no Revenue credentials, ever.
- Money is never handled with JavaScript floats (`decimal.js` canonical strings).
- If an item cannot be classified reliably it becomes `REQUIRES_REVIEW`, never a silent guess.
- Saved profiles, employment, claims, investments, and import summaries use Supabase with per-user row-level security. No analytics, telemetry, or external document-processing API is configured.
- Trading 212 CSV files are previewed in the browser and sent to the app server only after confirmation. Parsed records and import metadata are saved, but the raw CSV is not stored by the app.

## Stack

Next.js (App Router) · TypeScript (strict) · pnpm · Supabase Auth + Postgres ·
Zod · decimal.js · Vitest · Playwright.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Before sign-in and saved records can run, create a Supabase project, apply both
SQL files in `supabase/migrations/` in timestamp order, and configure its
project URL, publishable key, site URL, and auth redirect URL. Until the
connection is configured, the app shows a setup-pending screen. The older
SQLite schema and repositories remain for legacy local data and repository
tests; the active workspace uses Supabase.

## Scripts

| Command            | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Start the development server               |
| `pnpm build`       | Production build                           |
| `pnpm lint`        | ESLint                                     |
| `pnpm typecheck`   | TypeScript type check                      |
| `pnpm test`        | Vitest unit/integration tests              |
| `pnpm e2e`         | Playwright browser tests                   |
| `pnpm db:generate` | Generate a legacy SQLite Drizzle migration |
| `pnpm db:migrate`  | Apply legacy SQLite migrations             |
| `pnpm format`      | Prettier format                            |
