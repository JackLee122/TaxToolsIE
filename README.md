# TaxToolie

An Irish Personal Tax Dashboard. A private, local-first alternative to
manually combining tax calculators and spreadsheets: estimate Income Tax, USC
and refunds for PAYE employment plus investments, track Capital Gains Tax and
fund/ETF exit tax, discover credits and reliefs, and get exactly what you need
to enter into Revenue.

**Scope for now (foundation):** scaffolding, domain/database schema, 2026 tax
rule configuration, Income Tax and USC calculation engines, and manual
employment entry. Parsers/imports, CGT and filings arrive in later phases.
The full MVP specification lives in `docs/irish_tax_dashboard_mvp_implementation_plan.md`.

## Non-negotiable product rules

- No LLM in the tax path. All calculations are deterministic and unit-tested.
- No Revenue filing, no Revenue login, no Revenue credentials, ever.
- Money is never handled with JavaScript floats (`decimal.js` canonical strings).
- If an item cannot be classified reliably it becomes `REQUIRES_REVIEW`, never a silent guess.
- Local-only: SQLite on disk, no analytics, no telemetry, no cloud, no third-party document processing.

## Stack

Next.js (App Router) · TypeScript (strict) · pnpm · SQLite + Drizzle ORM ·
Zod · decimal.js · Vitest · Playwright.

## Getting started

```bash
pnpm install
pnpm db:migrate   # create/migrate the local SQLite database
pnpm dev          # http://localhost:3000
```

Optional: copy `.env.example` values into `.env.local` to override the
database path. No secrets are required for the MVP.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type check |
| `pnpm test` | Vitest unit/integration tests |
| `pnpm e2e` | Playwright browser tests |
| `pnpm db:generate` | Generate a Drizzle migration from `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to the local SQLite database |
| `pnpm format` | Prettier format |