# Irish Personal Tax Dashboard — MVP Implementation Plan

**Target:** Codex / OpenCode implementation handoff  
**Status:** Initial greenfield MVP specification  
**Primary jurisdiction:** Republic of Ireland  
**Initial tax year:** 2026  
**Primary user type:** Irish-resident, Irish-domiciled individual with PAYE employment plus investments  
**Architecture principle:** deterministic calculation and parsing; no LLM dependency  
**Filing principle:** calculate, reconcile, and guide; do not submit returns to Revenue in the MVP

---

## 1. Objective

Build a private, local-first web application that combines:

1. Irish PAYE employment information.
2. Tax already paid through payroll.
3. Revenue documents.
4. Investment transactions and investment income.
5. Tax credits, reliefs, exemptions, and deductions.
6. Estimated Income Tax and USC liability.
7. Capital Gains Tax calculations for ordinary shares.
8. Separate investment-fund / ETF tax tracking where the user explicitly confirms the applicable tax regime.
9. Estimated tax refund or underpayment.
10. Unemployment refund eligibility guidance.
11. Tax-filing deadlines and required Revenue actions.
12. A clear annual summary showing exactly which figures need to be entered into Revenue myAccount / ROS.

The application must replace the need to manually combine multiple tax calculators and spreadsheets.

The MVP is **not** a Revenue filing agent. It must never request the user's Revenue password, myAccount credentials, ROS password, ROS certificate, or two-factor authentication code.

---

# 2. Non-negotiable product rules

These rules override convenience.

## 2.1 No LLM in the tax path

Do not use an LLM API for:

- tax calculations
- tax-rule selection
- broker transaction classification
- PDF value extraction
- security classification
- eligibility decisions
- investment matching
- refund calculations

All of these must be deterministic and unit tested.

An LLM explanation layer may be added in a later phase, but it must never be the source of a calculated tax figure.

## 2.2 Do not infer uncertain tax treatment

If an instrument or income item cannot be classified reliably, mark it as `REQUIRES_REVIEW`.

Examples:

- ETF vs ordinary company share
- equivalent offshore fund status
- foreign life policy
- foreign withholding-tax entitlement
- deposit interest jurisdiction
- unusual share scheme
- crypto
- options
- CFDs
- spread betting
- employee share schemes
- investment trusts whose treatment is not explicitly configured

The application must not silently pick a tax treatment.

## 2.3 Revenue is authoritative

Every tax-year ruleset must contain:

- rule identifier
- tax year
- value
- source URL
- source title
- date last verified

Do not hard-code tax constants directly into calculation functions.

## 2.4 No floats for money

Never use JavaScript floating-point arithmetic for tax or investment calculations.

Use `decimal.js` or an equivalent arbitrary-precision decimal library.

Persist:

- monetary values as canonical decimal strings
- quantities as canonical decimal strings
- FX rates as canonical decimal strings
- percentages/rates as canonical decimal strings

Round only at explicitly defined output boundaries.

## 2.5 Raw documents are disposable by default

The default workflow is:

1. user uploads a PDF/CSV;
2. server parses it;
3. user reviews extracted fields;
4. structured values are saved;
5. raw upload is deleted.

Do not permanently store raw Revenue PDFs, payslips, broker statements, API keys, or tax documents unless a future feature explicitly adds encrypted document storage.

---

# 3. MVP deployment model

The MVP is a **single-user local application**.

Do not build multi-user SaaS infrastructure yet.

Recommended stack:

- Next.js with App Router
- TypeScript with strict mode
- pnpm
- SQLite
- Drizzle ORM
- Zod for all runtime schemas
- decimal.js for monetary calculations
- pdfjs-dist for text extraction from text-based PDFs
- Papa Parse or equivalent for broker CSV import
- Vitest for unit/integration tests
- Playwright for critical browser flows

Use current stable package versions when implementation begins and commit the lockfile.

## 3.1 Local-only assumptions

- bind development service to localhost by default
- no analytics
- no telemetry
- no third-party document-processing API
- no third-party OCR API
- no LLM API
- no cloud database
- no automatic remote backups
- no authentication required for the initial localhost build

The architecture must still keep persistence and domain logic separated so authentication/encrypted cloud storage can be added later.

---

# 4. Repository structure

Use this structure unless an existing repository already has an equivalent organization:

```text
/
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   ├── tax-years/
│   │   └── [year]/
│   ├── employment/
│   ├── investments/
│   ├── credits/
│   ├── imports/
│   ├── filing/
│   └── settings/
├── components/
│   ├── dashboard/
│   ├── employment/
│   ├── investments/
│   ├── tax/
│   ├── imports/
│   └── ui/
├── lib/
│   ├── db/
│   ├── domain/
│   │   ├── employment/
│   │   ├── investments/
│   │   ├── tax/
│   │   ├── credits/
│   │   └── filing/
│   ├── parsers/
│   │   ├── revenue/
│   │   ├── trading212/
│   │   └── generic/
│   ├── rules/
│   │   └── ie/
│   │       └── 2026/
│   ├── services/
│   ├── validation/
│   └── utils/
├── drizzle/
├── tests/
│   ├── fixtures/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── TAX_RULES.md
│   ├── DATA_MODEL.md
│   ├── PARSERS.md
│   └── LIMITATIONS.md
├── .env.example
├── package.json
└── README.md
```

Domain calculation code must not depend on React, Next.js page components, or the database.

---

# 5. Supported tax scope

## 5.1 Fully supported in MVP

### Employment

- PAYE employment income
- multiple employments
- gross pay
- taxable pay
- PAYE Income Tax deducted
- USC deducted
- PRSI deducted as an imported/displayed value
- employer identifiers/names
- employment start/end dates where available
- pension deductions if explicitly available
- tax-year totals

### Income Tax

- 2026 Irish Income Tax bands
- Personal Tax Credit
- Employee Tax Credit
- user-entered additional supported credits
- standard-rate and higher-rate calculations
- estimated tax due
- comparison with PAYE already deducted
- estimated Income Tax overpayment or underpayment

### USC

- 2026 USC exemption threshold
- 2026 standard USC bands
- employment USC estimation
- dividend income included in USC-taxable income
- deposit interest excluded from USC
- USC already paid
- estimated USC overpayment or underpayment

### Investment shares

- purchases
- sales
- fees
- fractional shares
- multiple currencies
- FIFO
- Irish four-week matching rule
- four-week loss restriction
- current-year capital losses
- carried-forward losses entered manually
- annual CGT personal exemption
- CGT estimate
- CGT payment periods/deadlines
- return filing deadline

### Investment income

- Irish dividends
- US dividends
- Canadian dividends
- UK dividends
- other foreign dividends
- Irish deposit interest
- EU deposit interest
- non-EU deposit interest
- foreign withholding tax as a separately tracked field
- gross/net values
- source jurisdiction
- currency and EUR-converted amount

### Funds / ETFs

Supported only when the user explicitly selects a tax classification.

For instruments marked `FUND_EXIT_TAX_38_2026`:

- acquisition lots
- disposal gains
- eight-year deemed-disposal dates
- deemed-disposal event schedule
- 38% 2026 rate
- warning that this is separate from ordinary CGT
- no €1,270 CGT exemption applied
- no automatic cross-offset against ordinary CGT losses

Do not automatically decide that every ETF uses this regime.

### Credits / reliefs / refund discovery

- Personal Tax Credit
- Employee Tax Credit
- Rent Tax Credit
- qualifying health expenses
- third-level tuition fee relief
- pension contribution relief input
- flat-rate employment expenses input
- manually entered Revenue credit
- claim status: available / entered / claimed / unsupported
- estimated value where deterministic
- Revenue filing destination guidance

### Refund / underpayment

- estimated PAYE Income Tax overpayment
- estimated USC overpayment
- estimated combined refund
- estimated underpayment
- comparison to Statement of Liability when one is uploaded
- unemployment-refund eligibility date
- four-year refund deadline warnings

## 5.2 Imported/displayed but not recalculated in MVP

PRSI must be imported and displayed but must **not** be independently recomputed for the user's entire tax position in v1.

Reason: non-employment PRSI treatment varies by income/source/status and should not be approximated.

For dividends and other items where Revenue states PRSI may apply, show:

`Potential additional PRSI may apply. PRSI is not included in this MVP estimate.`

Do not include an invented PRSI estimate in the refund total.

## 5.3 Explicitly unsupported in MVP

Mark these clearly:

- self-employment / Case I business accounts
- rental income
- crypto
- CFDs
- spread betting
- options/futures
- employee stock options / RTSO
- ESPPs requiring employment-share calculations
- RSUs
- CAT
- property CGT
- sole trader expenses
- foreign employment
- remittance-basis calculations
- non-resident taxation
- non-domiciled taxation
- married/joint assessment calculations
- proprietary directors
- company tax
- VAT
- Form 11 electronic submission
- ROS integration
- automatic Revenue login
- pension contribution optimization
- exact DTA calculations for arbitrary countries
- automatic ETF/offshore-fund legal classification

The user can record unsupported income manually, but it must not be included in an authoritative-looking final figure.

---

# 6. Supported-user guardrail

During onboarding ask:

```text
Tax residence for this tax year:
[ ] Irish resident

Domicile:
[ ] Irish domiciled

Assessment status:
[ ] Single / individually assessed PAYE taxpayer

Main income:
[ ] PAYE employment

Do you have self-employment or rental income?
[ ] No
```

The 2026 calculation engine can run only if the supported conditions are satisfied.

If not, display:

> This profile falls outside the current calculation scope. Data can still be imported and viewed, but the app will not produce a final refund/tax-due estimate.

This prevents the application from pretending that a limited ruleset covers all Irish taxpayers.

---

# 7. Core data model

Use IDs as UUIDs.

## 7.1 TaxProfile

```ts
type TaxProfile = {
  id: string;
  taxYear: number;
  residenceStatus: "IRISH_RESIDENT" | "OTHER";
  domicileStatus: "IRISH_DOMICILED" | "OTHER";
  assessmentStatus: "SINGLE_INDIVIDUAL" | "UNSUPPORTED";
  dateOfBirth?: string;
  studentStatus: boolean;
  fullTimeStudent?: boolean;
  unemployedAtYearEnd: boolean;
  unemploymentStartDate?: string;
  receivesTaxableSocialWelfare: boolean;
  calculationStatus: "SUPPORTED" | "PARTIAL" | "UNSUPPORTED";
};
```

## 7.2 EmploymentRecord

```ts
type EmploymentRecord = {
  id: string;
  taxYear: number;
  employerName: string;
  employerRegistrationNumber?: string;
  startDate?: string;
  endDate?: string;

  grossPay: DecimalString;
  taxablePay: DecimalString;

  incomeTaxDeducted: DecimalString;
  uscDeducted: DecimalString;
  prsiDeducted: DecimalString;

  employeePensionContributions?: DecimalString;
  otherDeductionAmount?: DecimalString;

  source:
    | "REVENUE_EDS"
    | "PAYSLIP"
    | "MANUAL";

  sourceDocumentId?: string;
  verifiedByUser: boolean;
};
```

Do not silently assume `grossPay === taxablePay`.

## 7.3 RevenueDocument

```ts
type RevenueDocument = {
  id: string;
  documentType:
    | "EMPLOYMENT_DETAIL_SUMMARY"
    | "STATEMENT_OF_LIABILITY"
    | "UNKNOWN";
  taxYear?: number;
  importedAt: string;
  parserVersion: string;
  parseStatus:
    | "PARSED"
    | "NEEDS_REVIEW"
    | "UNSUPPORTED";
  rawFileRetained: false;
};
```

## 7.4 StatementOfLiabilityRecord

```ts
type StatementOfLiabilityRecord = {
  id: string;
  taxYear: number;
  incomeTaxLiability?: DecimalString;
  uscLiability?: DecimalString;
  incomeTaxPaid?: DecimalString;
  uscPaid?: DecimalString;
  overpayment?: DecimalString;
  underpayment?: DecimalString;
  sourceDocumentId: string;
  verifiedByUser: boolean;
};
```

## 7.5 BrokerAccount

```ts
type BrokerAccount = {
  id: string;
  broker:
    | "TRADING_212"
    | "DEGIRO"
    | "IBKR"
    | "REVOLUT"
    | "GENERIC";
  displayName: string;
  baseCurrency?: string;
};
```

Only Trading 212 needs first-class import support in the first milestone.

## 7.6 Instrument

```ts
type Instrument = {
  id: string;
  symbol: string;
  isin?: string;
  name?: string;
  currency: string;

  taxTreatment:
    | "SHARE_CGT"
    | "FUND_EXIT_TAX_38_2026"
    | "UNKNOWN"
    | "UNSUPPORTED";

  taxTreatmentConfirmedByUser: boolean;
};
```

Any imported instrument starts as `UNKNOWN` unless a deterministic stored mapping already exists and has been user-confirmed.

## 7.7 InvestmentTransaction

```ts
type InvestmentTransaction = {
  id: string;
  brokerAccountId: string;
  instrumentId?: string;

  transactionType:
    | "BUY"
    | "SELL"
    | "DIVIDEND"
    | "INTEREST"
    | "FEE"
    | "TAX_WITHHELD"
    | "CASH_DEPOSIT"
    | "CASH_WITHDRAWAL"
    | "OTHER";

  timestamp: string;
  tradeDate: string;

  quantity?: DecimalString;
  unitPrice?: DecimalString;
  grossAmount?: DecimalString;
  feeAmount?: DecimalString;
  withholdingTaxAmount?: DecimalString;

  currency: string;

  eurFxRate?: DecimalString;
  eurGrossAmount?: DecimalString;
  eurFeeAmount?: DecimalString;
  eurWithholdingTaxAmount?: DecimalString;

  externalId?: string;
  importBatchId: string;
  rawDescription?: string;

  reviewStatus:
    | "CONFIRMED"
    | "REQUIRES_REVIEW";
};
```

## 7.8 DividendIncome

Normalize broker dividends into a separate tax-domain record:

```ts
type DividendIncome = {
  id: string;
  transactionId: string;
  taxYear: number;
  instrumentId: string;

  jurisdiction:
    | "IRELAND"
    | "USA"
    | "CANADA"
    | "UK"
    | "OTHER";

  grossEur: DecimalString;
  foreignTaxWithheldEur: DecimalString;
  irishDwtWithheldEur: DecimalString;
  irishEncashmentTaxEur: DecimalString;

  treatment:
    | "IRISH_DIVIDEND"
    | "US_DIVIDEND"
    | "CANADIAN_DIVIDEND"
    | "UK_DIVIDEND"
    | "OTHER_FOREIGN_DIVIDEND";

  verifiedByUser: boolean;
};
```

Do not derive jurisdiction solely from trading currency.

## 7.9 InterestIncome

```ts
type InterestIncome = {
  id: string;
  transactionId?: string;
  taxYear: number;

  sourceType:
    | "IRISH_DEPOSIT"
    | "EU_DEPOSIT"
    | "NON_EU_DEPOSIT"
    | "OTHER_INTEREST"
    | "UNKNOWN";

  jurisdiction?: string;

  grossEur: DecimalString;
  taxWithheldEur: DecimalString;

  verifiedByUser: boolean;
};
```

Trading 212 cash interest must default to `UNKNOWN` until the source entity/jurisdiction is confirmed by the user.

Do not assume it is ordinary Irish DIRT interest.

## 7.10 CreditClaim

```ts
type CreditClaim = {
  id: string;
  taxYear: number;

  type:
    | "PERSONAL_TAX_CREDIT"
    | "EMPLOYEE_TAX_CREDIT"
    | "RENT_TAX_CREDIT"
    | "HEALTH_EXPENSE_RELIEF"
    | "TUITION_FEE_RELIEF"
    | "PENSION_RELIEF"
    | "FLAT_RATE_EXPENSE"
    | "MANUAL_REVENUE_CREDIT";

  inputAmount?: DecimalString;
  eligibleAmount?: DecimalString;
  estimatedTaxValue: DecimalString;

  status:
    | "AUTO_INCLUDED"
    | "POTENTIALLY_ELIGIBLE"
    | "USER_CONFIRMED"
    | "ALREADY_CLAIMED"
    | "NOT_ELIGIBLE";

  evidenceNote?: string;
};
```

## 7.11 CalculationRun

Every calculation must be reproducible.

```ts
type CalculationRun = {
  id: string;
  taxYear: number;
  rulesVersion: string;
  createdAt: string;
  inputFingerprint: string;
  resultJson: string;
};
```

---

# 8. 2026 tax-rule configuration

Create:

```text
lib/rules/ie/2026/
├── incomeTax.ts
├── usc.ts
├── cgt.ts
├── investments.ts
├── credits.ts
├── deadlines.ts
├── rules.ts
└── sources.ts
```

## 8.1 Income Tax — 2026 supported single taxpayer

Configure:

- standard rate: 20%
- higher rate: 40%
- single-person standard-rate cut-off: €44,000
- Single Person Tax Credit: €2,000
- maximum Employee Tax Credit: €2,000

Employee Tax Credit logic:

- if qualifying PAYE income >= €10,000: €2,000
- if qualifying PAYE income < €10,000: 20% of qualifying PAYE income
- only one Employee Tax Credit regardless of number of employments

## 8.2 USC — 2026

USC exemption:

- if total USC-liable income <= €13,000: USC = €0

If above €13,000, calculate USC on the full USC-liable income using:

- first €12,012 at 0.5%
- next €16,688 at 2%
- next €41,344 at 3%
- balance at 8%

Do not implement reduced medical-card/age-70 rates in the initial supported profile.

## 8.3 CGT — ordinary shares

Configure:

- ordinary CGT rate: 33%
- personal annual exemption: €1,270
- personal exemption applies after allowable losses
- annual exemption cannot create or increase a loss
- annual exemption is not transferred between years

Deadlines:

- disposals 1 January through 30 November:
  - CGT payment due 15 December of same year
- disposals 1 December through 31 December:
  - CGT payment due 31 January of next year
- CGT return:
  - due by 31 October of the year following disposal

Generate explicit reminders from disposal dates.

## 8.4 Fund regime

For a user-confirmed instrument classified as `FUND_EXIT_TAX_38_2026`:

- 2026 tax rate: 38%
- track acquisition lots independently
- create deemed-disposal event exactly eight years from each acquisition date
- show upcoming deemed disposals
- do not use the €1,270 CGT exemption
- do not offset ordinary CGT losses against this regime
- keep all calculations separately identified as `Fund / ETF exit-tax estimate`

Do not attempt to classify whether a security legally belongs in this regime.

## 8.5 DIRT / deposit interest

Configure:

- Irish DIRT rate: 33%
- EU deposit interest: use applicable DIRT treatment for supported 2026 calculation
- non-EU / UK deposit interest:
  - tax treatment depends on marginal rate and Revenue rules
  - no USC
  - potential PRSI displayed as an unresolved liability outside v1 calculation

Where source type is `UNKNOWN`, exclude from final tax result and require review.

## 8.6 Dividends

For Irish company dividends:

- calculate on gross dividend
- DWT tracked as tax already withheld
- 2026 DWT rate expected from imported data; validate if 25%
- Income Tax applies at user's marginal Income Tax rates
- dividend included in USC-liable income
- additional PRSI is outside the v1 refund total

For US/Canadian/other foreign dividends:

- store gross dividend
- store foreign withholding separately
- include gross dividend in Irish taxable income
- include in USC-liable income
- do not invent a foreign-tax credit

For US/Canadian dividends, implement a configurable `foreignTaxCreditCandidate` field, but do not include it in final tax due until the supported DTA credit logic has its own verified unit-tested rules module.

For UK dividends:

- use user-confirmed EUR-converted taxable amount
- do not automatically credit UK domestic tax

## 8.7 Rent Tax Credit — 2026

For supported single taxpayer:

- maximum credit: €1,000
- tax relief is 20% of qualifying rent
- cap final credit at €1,000
- cannot reduce USC or PRSI
- cannot exceed remaining Income Tax liability

Input fields:

- total rent actually paid
- amount attributable to utilities/services
- qualifying rent = rent paid minus non-rent services
- property use:
  - principal private residence
  - property used to attend work
  - property used to attend an approved course
- landlord relationship declaration
- tenancy qualification confirmation

Do not auto-approve the claim unless required eligibility confirmations are supplied.

## 8.8 Health expenses

Supported basic health relief:

- qualifying unreimbursed expenses only
- standard relief rate: 20%
- subtract insurance/HSE/other reimbursement before relief
- nursing-home highest-rate relief is out of initial MVP

Formula:

```text
eligibleHealthExpense =
  max(0, expensePaid - reimbursements)

estimatedRelief =
  eligibleHealthExpense * 20%
```

The user must categorize an expense as qualifying.

Do not automatically decide from merchant name.

## 8.9 Tuition fee relief

For supported full-time third-level course:

- standard relief rate: 20%
- max qualifying fees: €7,000 per person per course per academic year
- full-time disregard: €3,000 per tax-year claim
- student contribution can count as a qualifying fee
- administration/student-centre/sports/USI levies do not qualify

Formula for a simple one-student, one-course, full-time claim:

```text
cappedFees = min(qualifyingTuitionPaid, 7000)
relievableFees = max(0, cappedFees - 3000)
estimatedRelief = relievableFees * 20%
```

If multiple students/courses are entered, apply the single annual disregard once after individual course caps.

## 8.10 Pension contribution relief

MVP supports user-entered employee pension contributions.

For users under 30:

- age-related limit: 15%

Additional age bands must exist in configuration:

- under 30: 15%
- 30–39: 20%
- 40–49: 25%
- 50–54: 30%
- 55–59: 35%
- 60+: 40%

Total earnings cap:

- €115,000

Do not attempt to optimize contribution amounts.

Calculate maximum potentially relievable employee contribution and warn if reported contributions exceed the age/earnings limit.

## 8.11 Four-year refund rule

Display refund-claim deadline by year.

Example:

- tax year 2022 claim deadline: 31 December 2026

Never present a tax refund as claimable after the four-year limit.

---

# 9. Revenue document import

## 9.1 Employment Detail Summary parser

Support text-based Revenue EDS PDFs.

Parser requirements:

1. Extract all PDF text.
2. Identify document type from heading/content.
3. Identify tax year.
4. Identify each employment.
5. Parse:
   - employer
   - gross pay
   - relevant taxable pay if shown
   - Income Tax deducted
   - USC deducted
   - PRSI deducted
   - other deductions where reliably labelled
6. Produce structured draft records.
7. Show a review screen before saving.
8. User must confirm parsed values.

Parser result:

```ts
type ParserResult<T> = {
  documentType: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  warnings: string[];
  data: T;
};
```

Do not use an arbitrary numeric ML/LLM confidence score.

Confidence rules must be deterministic:

- `HIGH`: all required headings found and totals reconcile
- `MEDIUM`: required fields found but one optional reconciliation check fails
- `LOW`: missing required headings or ambiguous values

If `LOW`, do not allow one-click import.

## 9.2 Statement of Liability parser

Extract, when present:

- tax year
- Income Tax liability
- USC liability
- tax paid
- USC paid
- overpayment
- underpayment
- tax credits/reliefs shown
- final balancing result

Use the Statement of Liability as a **reconciliation document**.

Do not overwrite application calculations with Revenue's figures.

Display:

```text
Our estimate        €X
Revenue statement   €Y
Difference          €Z
```

If absolute difference exceeds €1, show a reconciliation warning.

## 9.3 Payslip parser

Payslip parsing is optional for the first commit set.

If added:

- support manual structured entry first
- parsing must be template-based
- never assume arbitrary payslip layouts are trustworthy
- monthly payslip totals must reconcile to EDS totals before being considered verified

## 9.4 OCR

No OCR in the first MVP.

If a PDF has no text layer:

> This PDF appears to be scanned. Automatic OCR is not supported in the current MVP. Enter the values manually.

---

# 10. Trading 212 import

Implement two routes.

## 10.1 CSV import — required first

Support Trading 212 exported reports.

The parser must normalize:

- orders/trades
- dividends
- interest
- fees
- withholding tax
- currency conversion fields if present

Store original external transaction ID where available.

Deduplicate by:

1. broker
2. external ID where available
3. otherwise deterministic fingerprint of timestamp + type + instrument + quantity + amount + currency

Reimporting the same report must not duplicate transactions.

## 10.2 API import — second

Allow optional Trading 212 API key in server-side `.env.local`.

Example configuration:

```text
TRADING212_API_KEY=
TRADING212_ENV=live
```

Rules:

- never expose key to browser JavaScript
- never write key to SQLite
- never log it
- redact authorization headers
- use server-only code

API integration must retrieve paginated historical data and follow the API-provided `nextPagePath` until null.

Persist normalized data, not raw API credentials.

Provide:

```text
Sync Trading 212
Last successful sync: <timestamp>
Imported: X new transactions
Skipped: Y duplicates
Review required: Z
```

## 10.3 ImportBatch

Every import creates:

```ts
type ImportBatch = {
  id: string;
  source: string;
  startedAt: string;
  completedAt?: string;
  importedCount: number;
  duplicateCount: number;
  reviewCount: number;
  errorCount: number;
};
```

---

# 11. Currency conversion

Every tax calculation must be in EUR.

Do not use the current FX rate to convert historic transactions.

Each taxable event must have an associated EUR conversion value.

Priority:

1. broker-provided EUR converted value if the broker explicitly reports it;
2. user-entered event-date FX rate;
3. approved configured historic FX provider in a future phase.

In the initial MVP, if neither broker EUR amount nor event-date FX is available:

- mark transaction `REQUIRES_REVIEW`
- request the EUR amount or FX rate
- exclude it from final tax computation

Do not silently use an annual average rate unless the specific tax rule allows it and that rule has been documented.

---

# 12. Ordinary share CGT engine

Create a pure calculation module.

```text
lib/domain/investments/cgt/
├── matchLots.ts
├── calculateDisposals.ts
├── losses.ts
├── calculateCgt.ts
└── types.ts
```

## 12.1 Transaction preparation

Before matching:

- filter to instrument tax treatment `SHARE_CGT`
- sort by timestamp ascending
- ensure all monetary values have EUR values
- split partial disposals as necessary
- include acquisition/disposal fees in allowable cost/proceeds calculations where appropriate
- reject negative/zero quantities except transaction types where explicitly valid

## 12.2 Basic matching

Normal rule:

**FIFO** — oldest shares of the same class are treated as disposed of first.

Instrument identity must be based on ISIN where available.

If no ISIN:

- use broker instrument ID
- otherwise user-confirmed symbol/security mapping

Do not merge securities merely because tickers match.

## 12.3 Four-week acquisition/disposal matching

Implement Irish special matching where shares acquired and sold within four weeks.

When a sale can be matched against shares purchased during the preceding four weeks, apply the special rule before ordinary FIFO according to Revenue guidance.

Keep a full audit trail:

```ts
type LotMatch = {
  disposalTransactionId: string;
  acquisitionTransactionId: string;
  quantityMatched: DecimalString;
  matchingRule: "FOUR_WEEK" | "FIFO";
  acquisitionCostEur: DecimalString;
  disposalProceedsEur: DecimalString;
  allowableFeesEur: DecimalString;
  gainLossEur: DecimalString;
};
```

## 12.4 Four-week loss restriction

If shares are sold at a loss and the same class is reacquired within four weeks, track the restricted loss separately.

A restricted loss must not be included in the general loss pool.

Model:

```ts
type CapitalLoss = {
  id: string;
  taxYear: number;
  amountEur: DecimalString;
  restriction:
    | "NONE"
    | "FOUR_WEEK_REPURCHASE";
  linkedInstrumentId?: string;
  remainingAmountEur: DecimalString;
};
```

A restricted loss can only be consumed according to the relevant subsequent disposal logic.

This section requires dedicated tests using Revenue examples.

## 12.5 Annual calculation

Produce:

```text
Gross gains
- allowable same-year losses
- allowable carried-forward losses
= net chargeable gains before exemption

- personal exemption (max €1,270)
= taxable gains

x 33%
= CGT liability
```

Rules:

- do not use the €1,270 exemption to create a loss
- do not carry unused exemption forward
- do not apply exemption to fund-regime gains
- show unused carried-forward loss separately

## 12.6 Payment-period allocation

Calculate CGT liability for:

- initial period: 1 Jan–30 Nov
- later period: 1 Dec–31 Dec

The UI must show due dates independently.

---

# 13. Fund / ETF deemed-disposal engine

Create separately from CGT.

Do not reuse CGT lot matching in a way that applies CGT exemptions or CGT loss logic.

For each acquisition lot:

```ts
type FundLot = {
  id: string;
  instrumentId: string;
  acquisitionDate: string;
  quantity: DecimalString;
  acquisitionCostEur: DecimalString;
  deemedDisposalDate: string;
  quantityRemaining: DecimalString;
};
```

`deemedDisposalDate` = acquisition date plus exactly eight calendar years.

Dashboard:

```text
Upcoming deemed disposals
2027
- Vanguard Example ETF
  Acquired: 14 Mar 2019
  Deemed disposal: 14 Mar 2027
  Original cost: €...
  Quantity remaining: ...
```

If market value on the deemed-disposal date is not known, do not calculate tax.

Status:

- upcoming
- value required
- calculated
- disposed before deemed-disposal date
- reviewed

The MVP must not automatically fetch market prices.

---

# 14. Income Tax engine

Create a pure function:

```ts
calculateIncomeTax2026(input: IncomeTaxInput): IncomeTaxResult
```

Input:

- PAYE taxable income
- supported taxable dividend income
- supported additional taxable income
- relievable pension deductions
- supported pre-tax deductions
- credits

Algorithm:

1. Sum taxable income.
2. Apply deductible reliefs in their correct stage.
3. Apply 20% to taxable income up to €44,000.
4. Apply 40% to remaining taxable income.
5. Produce gross Income Tax.
6. Apply non-refundable credits.
7. Income Tax cannot fall below €0.
8. Compare with Income Tax already deducted/withheld where the withheld item qualifies as a credit.
9. Produce overpayment or underpayment.

Do not combine CGT or fund exit tax into Income Tax.

They must remain separate tax buckets.

---

# 15. USC engine

Create:

```ts
calculateUsc2026(input: UscInput): UscResult
```

Explicitly classify each income item as USC-liable or USC-exempt.

Initial categories:

| Income | USC |
|---|---|
| PAYE employment income | included |
| ordinary dividends | included |
| Irish deposit interest subject to DIRT | excluded |
| EU/non-EU deposit interest | excluded |
| ordinary capital gains | excluded from USC engine |
| fund exit-tax gain | excluded from USC engine |
| exempt DSP payment | excluded |
| unsupported income | do not assume |

Algorithm:

1. calculate total USC-liable income;
2. if <= €13,000 => €0;
3. otherwise apply all 2026 bands to the full amount;
4. compare with USC already deducted;
5. output estimated overpayment/underpayment.

---

# 16. Credits and reliefs engine

Credits/reliefs must be modeled by type.

Never simply subtract all claims from the final tax balance.

Different claim types act at different stages.

Create:

```ts
type TaxAdjustment =
  | { stage: "DEDUCTION_FROM_INCOME"; amount: DecimalString }
  | { stage: "INCOME_TAX_CREDIT"; amount: DecimalString }
  | { stage: "WITHHOLDING_CREDIT"; amount: DecimalString };
```

Examples:

- pension relief -> deduction/relief against relevant income calculation
- Personal Tax Credit -> Income Tax credit
- Employee Tax Credit -> Income Tax credit
- Rent Tax Credit -> Income Tax credit
- health expense relief -> Income Tax relief/credit equivalent as configured
- DWT -> withholding credit
- PAYE already deducted -> tax already paid, not a tax credit entitlement

This distinction must be visible in code and tests.

---

# 17. Refund engine

Create a summary object:

```ts
type AnnualTaxPosition = {
  taxYear: number;

  employmentIncomeEur: DecimalString;
  dividendIncomeEur: DecimalString;
  interestIncomeEur: DecimalString;

  estimatedIncomeTaxLiabilityEur: DecimalString;
  estimatedUscLiabilityEur: DecimalString;

  payeIncomeTaxPaidEur: DecimalString;
  uscPaidEur: DecimalString;

  estimatedIncomeTaxOverpaymentEur: DecimalString;
  estimatedIncomeTaxUnderpaymentEur: DecimalString;

  estimatedUscOverpaymentEur: DecimalString;
  estimatedUscUnderpaymentEur: DecimalString;

  estimatedPayeRefundEur: DecimalString;
  estimatedPayeUnderpaymentEur: DecimalString;

  cgtLiabilityEur: DecimalString;
  fundTaxLiabilityEur: DecimalString;

  unresolvedItemsCount: number;
  finalEstimateStatus:
    | "COMPLETE"
    | "INCOMPLETE_REVIEW_REQUIRED"
    | "UNSUPPORTED";
};
```

## 17.1 Refund presentation

Never show a large green "refund" figure if unresolved taxable items exist.

If unresolved items exist:

```text
Current calculated position: €X refund
Status: INCOMPLETE

3 taxable items still require review, so this is not yet a final estimate.
```

## 17.2 Overall amount due

Do not net unrelated tax deadlines into one misleading number.

Display separately:

```text
PAYE/USC balance        +€...
CGT due                 -€...
Fund tax due            -€...
```

Then an optional:

```text
Net cash impact         €...
```

clearly labelled as a convenience figure, not a Revenue filing amount.

---

# 18. Unemployment refund feature

Input:

- last employment end date
- whether emergency tax was applied
- whether leaving Ireland permanently
- whether user has other taxable income
- whether user receives taxable Jobseeker's Benefit / taxable social welfare

Eligibility logic for guidance:

- emergency tax in last employment -> potentially claim immediately
- leaving Ireland permanently -> potentially claim immediately
- no other taxable income -> claim from four weeks after becoming unemployed
- receiving other taxable income such as taxable Jobseeker's Benefit -> claim from eight weeks after unemployment

The app must calculate and display the earliest claim date.

Example:

```text
Employment ended: 31 August 2026
Other taxable income: No

Earliest unemployment repayment claim date:
28 September 2026

Revenue path:
myAccount → PAYE Services → Claim unemployment repayment
```

This feature is guidance only.

The actual estimated refund still comes from the tax engine.

---

# 19. Claim discovery

Create a "Potential claims" page.

Cards:

## Rent

Ask:

- did you pay rent?
- amount
- did rent include utilities/services?
- was property used as home / work attendance / approved course attendance?
- landlord relationship
- already claimed?

Output:

- likely eligible
- not eligible based on supplied answers
- needs review
- estimated credit

## Health

Ask:

- qualifying expense amount
- reimbursement from insurance/HSE/other
- nursing home expense? If yes, mark unsupported-special-case.

Output basic 20% relief.

## Education

Ask:

- did user personally pay the fee?
- approved third-level course confirmation
- full-time/part-time
- qualifying tuition/student-contribution amount
- non-qualifying levies
- number of students/courses

Output estimated relief.

## Pension

Ask:

- age
- PAYE remuneration relevant to contribution
- employee contribution
- whether already relieved through payroll

Prevent double counting.

## Flat-rate expenses

MVP does not need the full Revenue occupation table.

Allow manual entry:

- occupation
- Revenue-confirmed annual allowance
- source/reference
- already claimed?

Show a link/source in the filing assistant.

---

# 20. Revenue filing requirement classifier

Determine whether the supported taxpayer should be guided toward:

- PAYE Income Tax Return / Form 12 via myAccount
- self-assessment registration / Form 11 via ROS
- separate CGT filing/payment action

For non-PAYE income:

- if taxable non-PAYE income is below €5,000 and gross non-PAYE income does not exceed €30,000:
  - display PAYE/myAccount route
- if taxable non-PAYE income exceeds €5,000 OR gross non-PAYE income exceeds €30,000:
  - display self-assessment registration / Form 11 warning

Do not automatically register or file.

Because Revenue guidance can distinguish `exceeds €5,000` from examples saying `€5,000 or more`, make the boundary a named rules constant and add a source note. Before enabling an exact €5,000 boundary decision in production, verify the current Revenue wording and test it. If exactly €5,000 occurs before verification, display `REQUIRES_REVIEW` rather than guessing.

CGT filing is separate:

- show required CGT return even where no CGT is payable because of losses/reliefs, where Revenue filing rules require the disposal to be returned.

---

# 21. Filing assistant

This is one of the core MVP outputs.

Page title:

**What to enter in Revenue**

Sections:

## PAYE return / myAccount

Show only applicable fields, for example:

```text
Employment
Imported from Revenue EDS.
No manual entry expected unless Revenue data is incorrect.

Non-PAYE Income
Dividends:
  Irish gross dividends           €...
  US gross dividends              €...
  Canadian gross dividends        €...
  UK taxable dividends            €...
  Other foreign dividends         €...

Deposit interest:
  Irish deposit interest          €...
  EU deposit interest             €...
  Non-EU deposit interest         €...

Credits and reliefs
Rent Tax Credit:
  qualifying rent                 €...
  estimated credit                €...

Health expenses:
  qualifying unreimbursed expense €...

Tuition fees:
  qualifying fees                 €...
```

Each row needs:

- amount
- calculation explanation
- source transactions/documents
- Revenue source reference
- status

Statuses:

- ready
- user confirmation required
- unsupported
- already claimed

## CGT

Show:

- disposal summary
- gains
- losses
- exemption
- taxable gain
- estimated tax
- payment deadline
- filing deadline
- audit trail link

## Funds / ETFs

Show separately.

Never merge into CGT field suggestions.

---

# 22. Dashboard

Top-level dashboard for selected year.

## 22.1 Summary

```text
2026 Tax Position

Employment income          €...
Investment income          €...
Income Tax paid            €...
USC paid                   €...
PRSI paid                  €...

Estimated Income Tax due   €...
Estimated USC due          €...

Estimated PAYE/USC refund  €...
or
Estimated PAYE/USC owed    €...
```

Below it:

```text
Investment taxes

CGT due                    €...
Fund/ETF tax due           €...
```

## 22.2 Claim opportunities

```text
Potentially claimable
✓ Rent Tax Credit
✓ Health expenses
? Tuition fees — more information required
✓ Employee Tax Credit included automatically
```

## 22.3 Deadlines

Example:

```text
15 Dec 2026   CGT payment — Jan–Nov disposals
31 Jan 2027   CGT payment — Dec disposals
31 Oct 2027   2026 CGT return
31 Dec 2026   Last date to claim a 2022 PAYE refund
```

Only show deadlines relevant to existing data.

## 22.4 Data completeness

```text
Revenue EDS                 ✓
Statement of Liability      —
Trading 212                 ✓
Unknown securities          2
Unreviewed interest items   1
FX values missing           0
```

Final tax estimate can be `COMPLETE` only when every tax-affecting review item is resolved.

---

# 23. Calculation audit trail

Every displayed figure must be explainable.

Clicking a value such as:

`CGT due: €312.44`

must show:

```text
Gross gains                     €...
Less current-year losses        €...
Less carried-forward losses     €...
Chargeable gains                €...
Less annual exemption           €1,270.00
Taxable gains                   €...
CGT rate                        33%
CGT                             €312.44
```

A disposal must drill down to lot matches.

A tax refund must drill down to:

- gross tax
- rate bands
- tax credits
- tax withheld
- USC
- reliefs

No unexplained calculated number should exist.

---

# 24. Validation and reconciliation

Implement reconciliation checks.

## Employment

- sum of employments = annual employment total
- no negative PAYE/USC unless document explicitly contains a refund adjustment
- tax year must match requested year

## Broker

- duplicate detection
- sale quantity cannot exceed available holdings unless short/unsupported instrument is explicitly detected
- currencies must be ISO codes
- all taxable foreign-currency events need EUR conversion
- all instruments need resolved tax treatment before complete estimate

## Tax

- Income Tax liability cannot be negative
- USC liability cannot be negative
- rent credit cannot exceed available Income Tax liability
- unused tax credits do not produce negative tax
- CGT exemption cannot create a capital loss
- fund tax cannot use CGT exemption
- unresolved transactions prevent `COMPLETE`

## Statement of Liability

Compare app values with Revenue values where compatible.

Do not demand zero difference where scope differs.

Show which components are excluded from comparison.

---

# 25. UX flows

## Flow A — first setup

1. Open app.
2. Create 2026 tax profile.
3. Confirm supported-profile questions.
4. Upload Revenue EDS.
5. Review extracted employment.
6. Import Trading 212 CSV.
7. Review unknown instruments.
8. Review investment income classifications.
9. Answer credits/reliefs questionnaire.
10. View dashboard.
11. Resolve all warnings.
12. Open "What to enter in Revenue".

## Flow B — Trading 212 API

1. Add API key to `.env.local`.
2. Restart server.
3. Settings detects configured key.
4. Click Sync.
5. Fetch all pages.
6. Deduplicate.
7. Normalize.
8. Display import summary.
9. Resolve review items.

## Flow C — Revenue reconciliation

1. Complete actual Revenue PAYE return.
2. Download Statement of Liability.
3. Upload to app.
4. Parse.
5. Compare app estimate vs Revenue.
6. Show difference by Income Tax / USC / refund.
7. Allow user notes for discrepancies.

---

# 26. Security requirements

Even local-first, treat data as highly sensitive.

## Must

- keep API secrets server-side
- redact secrets from logs
- use restrictive file-upload size limits
- validate MIME and file extension
- parse only expected PDF/CSV formats
- generate random temporary filenames
- delete temporary files in `finally`
- protect against CSV formula injection when re-exporting
- HTML-escape imported descriptions
- validate all server actions with Zod
- disable arbitrary filesystem paths from user input
- use prepared ORM queries
- never execute imported content
- never render PDF text as HTML without escaping

## Must not

- upload data to OpenAI/Anthropic/Google
- store Revenue credentials
- automate browser login to Revenue
- save Trading 212 API key to database
- log full tax documents
- commit `.env.local`
- expose debug endpoints containing financial data

---

# 27. Tests

Tax software must be test-first at the domain layer.

## 27.1 Income Tax tests

At minimum:

1. €0 employment income.
2. €5,000 PAYE income — Employee Tax Credit capped at 20%.
3. €10,000 PAYE income — full Employee Tax Credit boundary.
4. Income below €44,000.
5. Income exactly €44,000.
6. Income above €44,000.
7. Personal + Employee credits reduce tax to zero but not below.
8. Additional dividend pushes taxpayer into 40% band.
9. Rent credit capped by remaining Income Tax.
10. Pension relief affects taxable income correctly.

## 27.2 USC tests

1. €0.
2. €13,000 => exempt.
3. €13,000.01 => full band calculation applies.
4. boundary €12,012.
5. boundary €28,700.
6. boundary €70,044.
7. dividends included.
8. deposit interest excluded.

## 27.3 CGT tests

1. simple buy/sell gain.
2. simple loss.
3. multiple buys FIFO.
4. fractional quantities.
5. multiple disposals.
6. fees.
7. annual exemption.
8. gains below exemption.
9. current-year losses.
10. carried-forward losses.
11. four-week purchase/sale matching.
12. four-week repurchase loss restriction.
13. initial-period payment deadline.
14. December payment deadline.
15. zero tax but disposal still reported in filing assistant.

Use Revenue examples as fixtures where possible.

## 27.4 Fund tests

1. acquisition + eight years exactly.
2. leap-year acquisition.
3. partial disposal before deemed-disposal date.
4. no market value => unresolved.
5. no CGT exemption applied.
6. 38% applied to configured taxable gain.

## 27.5 Import tests

Maintain anonymized fixtures for:

- Revenue EDS
- Statement of Liability
- Trading 212 CSV

Tests:

- parse known format
- duplicate import idempotency
- malformed row
- missing amount
- unsupported currency
- unknown transaction type
- invalid PDF
- scanned/no-text PDF
- parser does not save low-confidence import without confirmation

---

# 28. Required implementation sequence

Implement in the following order.

Do not skip ahead.

Each phase should be independently committed.

## Commit 01 — scaffold

- Next.js/TypeScript/pnpm
- lint
- formatter
- Vitest
- Playwright
- SQLite
- Drizzle
- decimal.js
- base layout/navigation
- `.env.example`
- privacy note
- no domain calculations yet

Acceptance:

- app starts locally
- tests run
- DB migration runs
- no secrets committed

## Commit 02 — domain schema

Implement:

- TaxProfile
- EmploymentRecord
- RevenueDocument
- BrokerAccount
- Instrument
- InvestmentTransaction
- DividendIncome
- InterestIncome
- CreditClaim
- ImportBatch
- CalculationRun

Acceptance:

- migrations created
- repository methods tested
- Decimal values round-trip without float conversion

## Commit 03 — tax-rule framework

Implement 2026 configuration and source metadata.

Acceptance:

- no calculation module contains anonymous hard-coded rates
- every rate/band has an official-source reference

## Commit 04 — Income Tax engine

Implement pure Income Tax calculation.

Acceptance:

- boundary tests pass
- Personal and Employee credits work
- result has audit breakdown

## Commit 05 — USC engine

Acceptance:

- 2026 threshold/bands tested
- deposit interest excluded
- dividends included

## Commit 06 — employment manual entry

UI:

- add/edit/delete employment
- annual totals
- tax-paid totals

Acceptance:

- dashboard uses real stored employment data

## Commit 07 — Revenue EDS parser

Acceptance:

- fixture parses
- review UI exists
- no values saved until confirmed
- raw PDF deleted

## Commit 08 — Statement of Liability parser

Acceptance:

- Revenue/app reconciliation screen works

## Commit 09 — Trading 212 CSV import

Acceptance:

- trades/dividends/interest import
- deduplication
- import batch summary
- unknown types require review

## Commit 10 — instrument tax classification

Acceptance:

- UNKNOWN instruments block final estimate
- user can classify as share, fund-regime, or unsupported
- decision stored with explicit user confirmation

## Commit 11 — CGT lot engine

Implement FIFO and audit trail first.

Acceptance:

- simple FIFO Revenue examples pass

## Commit 12 — four-week CGT rules

Acceptance:

- four-week Revenue examples pass
- restricted losses tracked separately

## Commit 13 — annual CGT calculation/deadlines

Acceptance:

- €1,270 exemption
- 33% rate
- payment periods
- filing deadline
- carried losses

## Commit 14 — dividend/interest engine

Acceptance:

- Irish/US/Canadian/UK/other dividend categories
- DWT/foreign withholding stored separately
- interest requires jurisdiction/type
- unresolved income blocks final estimate

## Commit 15 — fund / ETF lot tracker

Acceptance:

- user-confirmed classification only
- eight-year schedule
- 38% 2026 calculation
- no CGT exemption

## Commit 16 — credits/reliefs

Implement:

- Personal
- Employee
- rent
- health
- tuition
- pension input/limit
- manual flat-rate expenses

Acceptance:

- all credits have audit explanation
- double-claim prevention fields exist

## Commit 17 — refund engine

Acceptance:

- Income Tax/USC overpayment
- Income Tax/USC underpayment
- unresolved-data status
- separate CGT/fund liabilities

## Commit 18 — unemployment refund guidance

Acceptance:

- immediate / 4-week / 8-week conditions
- earliest date
- Revenue instructions

## Commit 19 — filing requirement classifier

Acceptance:

- myAccount vs self-assessment warning
- exact boundary review guard
- separate CGT actions

## Commit 20 — filing assistant

Acceptance:

- every supported figure has a Revenue-entry summary
- every figure links to its audit trail
- unresolved figures visibly blocked

## Commit 21 — dashboard

Acceptance:

- annual tax position
- investments
- credits
- deadlines
- completeness
- warnings

## Commit 22 — Trading 212 API

Acceptance:

- server-only secret
- cursor pagination
- idempotent sync
- sync summary
- no key in logs/database/client

## Commit 23 — privacy/security pass

Acceptance:

- temporary files verified deleted
- upload limits
- validation
- secret redaction
- no telemetry/network document processing

## Commit 24 — end-to-end fixtures

Create full synthetic scenario:

- one PAYE employment
- employment ended during year
- ordinary share buys/sells
- one four-week transaction scenario
- dividends
- deposit interest
- one fund-classified instrument
- rent
- health expenses
- tuition fee
- Revenue EDS
- Statement of Liability

Expected final result must be asserted end-to-end.

---

# 29. MVP completion criteria

MVP is complete only when a supported user can:

1. Create a 2026 profile.
2. Import a Revenue Employment Detail Summary.
3. Confirm employment/pay/tax data.
4. Import Trading 212 data from CSV.
5. Optionally sync Trading 212 by API.
6. Resolve every instrument tax classification.
7. See ordinary share CGT using Irish matching rules.
8. See dividends and interest by tax category.
9. Track manually confirmed fund/ETF deemed disposals.
10. Enter rent, health, tuition and pension information.
11. See Income Tax and USC calculation breakdown.
12. See PAYE/USC paid.
13. See estimated refund or underpayment.
14. See CGT separately.
15. See fund tax separately.
16. See unemployment-refund eligibility guidance.
17. See relevant deadlines.
18. See whether myAccount or self-assessment is likely required.
19. See exactly what figures need to be entered into Revenue.
20. Upload a Statement of Liability and reconcile it against the estimate.
21. Trace every calculated number back to source data and calculation steps.
22. Complete all of the above without an LLM API or third-party document processor.

---

# 30. UI language requirements

Never state:

- "You definitely owe"
- "Revenue owes you"
- "This ETF is definitely taxed as..."
- "This return is correct"

Use:

- "Estimated tax due"
- "Estimated refund"
- "Based on the information currently entered"
- "Tax treatment confirmed by you"
- "Requires review"
- "Revenue reconciliation"
- "Potentially eligible"

Whenever unresolved data exists, show it beside the estimate.

---

# 31. Data export

Add a local export feature before MVP release.

Export JSON:

```text
tax-export-2026.json
```

Contents:

- profile
- employment
- imported normalized transactions
- instrument classifications
- claims
- calculation results
- source metadata

Do not export secrets.

Also export a human-readable CSV/Markdown annual summary.

This protects the user from application/database failure and keeps data portable.

---

# 32. Later phases — explicitly not part of initial MVP

After MVP stability:

1. 2022–2025 historical tax-year rule packs.
2. Automated historical refund scan across four years.
3. DEGIRO importer.
4. IBKR importer.
5. Revolut importer.
6. Generic broker mapping wizard.
7. More complete DTA foreign-tax-credit engine.
8. PRSI engine for investment/unearned income.
9. married/joint assessment.
10. self-employed income.
11. rental income.
12. additional tax credits.
13. receipt storage.
14. optional OCR.
15. encrypted multi-device sync.
16. authentication.
17. public SaaS mode.
18. accountant export.
19. Form 11/CG1 structured report generation.
20. optional natural-language explanation assistant.

Any future LLM feature must consume already-calculated structured values; it must never generate those values.

---

# 33. 2026 official-rule baseline

The initial implementation should be checked against the following Revenue guidance before merge.

## Income Tax and credits

2026 single-person standard-rate band:
- €44,000 at 20%, balance at 40%.

2026 credits:
- Single Person Tax Credit: €2,000.
- Employee Tax Credit: max €2,000.

Revenue:
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/tax-relief-charts/index.aspx
- https://www.revenue.ie/en/jobs-and-pensions/calculating-your-income-tax/how-income-tax-is-calculated.aspx
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/income-and-employment/employee-tax-credit/index.aspx

## USC

2026:
- exemption limit €13,000.
- first €12,012 at 0.5%.
- next €16,688 at 2%.
- next €41,344 at 3%.
- balance at 8%.

Revenue:
- https://www.revenue.ie/en/jobs-and-pensions/usc/standard-rates-thresholds.aspx
- https://www.revenue.ie/en/jobs-and-pensions/usc/exempt-payments-income.aspx

## CGT

- ordinary rate: 33%.
- personal exemption: €1,270.
- FIFO and special four-week share rules apply.
- Jan–Nov CGT payment deadline: 15 December.
- December CGT payment deadline: 31 January following year.
- return deadline: 31 October following disposal year.

Revenue:
- https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/how-to-calculate-cgt.aspx
- https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/selling-or-disposing-of-shares.aspx
- https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/when-and-how-do-you-pay-and-file-cgt.aspx

## Investment funds

2026 individual rate for relevant Irish investment funds / equivalent offshore funds covered by the rule:
- 38% from 1 January 2026.

Revenue:
- https://www.revenue.ie/en/tax-professionals/ebrief/2026/no-0162026.aspx

Do not treat this single rate statement as sufficient evidence to auto-classify an ETF.

## Dividends

Revenue confirms:
- dividend income is taxable;
- Irish DWT is 25%;
- ordinary dividend income can be liable to Income Tax, USC and PRSI;
- foreign dividend treatment depends on source and treaty.

Revenue:
- https://www.revenue.ie/en/additional-incomes/dividend-income/index.aspx

## Deposit interest

- Irish DIRT rate: 33%.
- deposit interest subject to the relevant rules is not liable to USC.
- non-EU interest treatment can depend on marginal rate.
- PRSI may apply.

Revenue:
- https://www.revenue.ie/en/additional-incomes/dirt/what-dirt-rate-is-applicable.aspx
- https://www.revenue.ie/en/additional-incomes/dirt/foreign-deposit-income.aspx
- https://www.revenue.ie/en/additional-incomes/dirt/how-do-you-declare-deposit-interest.aspx

## PAYE vs self-assessment

Revenue states self-assessment registration is required where:
- taxable non-PAYE income exceeds €5,000; or
- gross non-PAYE income exceeds €30,000.

Revenue:
- https://www.revenue.ie/en/self-assessment-and-self-employment/guide-to-self-assessment/register-it-self-assessment.aspx

## Rent Tax Credit

2026:
- €1,000 maximum for an individual;
- relief is 20% of qualifying rent;
- cannot exceed Income Tax liability.

Revenue:
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rent-credit/index.aspx
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rent-credit/how-much-claim.aspx

## Health expenses

- generally 20% relief for qualifying unreimbursed health expenses.

Revenue:
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/health-and-age/health-expenses/index.aspx

## Tuition

- 20% standard-rate relief.
- qualifying fee cap €7,000 per person/course/year.
- full-time disregard €3,000.
- part-time disregard €1,500.

Revenue:
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/education/tuition-fees-paid-for-third-level-education/how-do-you-calculate-the-relief.aspx

## Pension relief limits

Age percentages:
- under 30: 15%
- 30–39: 20%
- 40–49: 25%
- 50–54: 30%
- 55–59: 35%
- 60+: 40%

Earnings limit:
- €115,000.

Revenue:
- https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx

## Revenue documents

Employment Detail Summary:
- https://www.revenue.ie/en/jobs-and-pensions/end-of-year-process/employment-detail-summary.aspx

Statement of Liability:
- https://www.revenue.ie/en/jobs-and-pensions/end-of-year-process/statement-of-liability.aspx

## Unemployment refund

Revenue guidance:
- immediately if emergency-tax conditions apply;
- immediately if leaving Ireland permanently;
- after four weeks without other taxable income;
- after eight weeks where other taxable income such as taxable Jobseeker's Benefit is received.

Revenue:
- https://www.revenue.ie/en/jobs-and-pensions/periods-of-unemployment/how-to-claim-a-tax-and-usc-refund-if-you-are-unemployed.aspx

## Four-year rule

Revenue:
- https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/four-year-rule/index.aspx

## Trading 212 API

Historical endpoints use cursor pagination and `nextPagePath`.

Trading 212:
- https://docs.trading212.com/api/historical-events/requestreport

---

# 34. Final implementation instruction to Codex/OpenCode

Treat this document as the authoritative MVP specification.

When an implementation detail is not explicitly covered:

1. Do not invent an Irish tax rule.
2. Keep the relevant item unresolved.
3. Add a typed `REQUIRES_REVIEW` state.
4. Document the gap in `docs/LIMITATIONS.md`.
5. Continue implementing all unaffected work.

Do not broaden scope.

Do not add an LLM.

Do not add Revenue login automation.

Do not add public SaaS infrastructure.

Do not silently simplify Irish share-matching rules.

Do not silently classify ETFs.

Do not use floating-point arithmetic for financial calculations.

Prefer a smaller verified calculation set over a broader approximate one.
