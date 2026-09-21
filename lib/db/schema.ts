import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Money/quantity columns are stored as canonical decimal strings (TEXT).
// Never use REAL/INTEGER for money.
export const money = (name: string) => text(name);

// ---------------------------------------------------------------------------
// Enums (as const arrays). The DB stores the string; TS gets the union.
// ---------------------------------------------------------------------------

export const EMPLOYMENT_SOURCES = ["REVENUE_EDS", "PAYSLIP", "MANUAL"] as const;
export type EmploymentSource = (typeof EMPLOYMENT_SOURCES)[number];

export const REVENUE_DOCUMENT_TYPES = [
  "EMPLOYMENT_DETAIL_SUMMARY",
  "STATEMENT_OF_LIABILITY",
  "UNKNOWN",
] as const;
export type RevenueDocumentType = (typeof REVENUE_DOCUMENT_TYPES)[number];

export const PARSE_STATUSES = ["PARSED", "NEEDS_REVIEW", "UNSUPPORTED"] as const;
export type ParseStatus = (typeof PARSE_STATUSES)[number];

export const BROKERS = ["TRADING_212", "DEGIRO", "IBKR", "REVOLUT", "GENERIC"] as const;
export type Broker = (typeof BROKERS)[number];

export const TAX_TREATMENTS = [
  "SHARE_CGT",
  "FUND_EXIT_TAX_38_2026",
  "UNKNOWN",
  "UNSUPPORTED",
] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

export const TRANSACTION_TYPES = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "INTEREST",
  "FEE",
  "TAX_WITHHELD",
  "CASH_DEPOSIT",
  "CASH_WITHDRAWAL",
  "OTHER",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const REVIEW_STATUSES = ["CONFIRMED", "REQUIRES_REVIEW"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const DIVIDEND_JURISDICTIONS = ["IRELAND", "USA", "CANADA", "UK", "OTHER"] as const;
export type DividendJurisdiction = (typeof DIVIDEND_JURISDICTIONS)[number];

export const DIVIDEND_TREATMENTS = [
  "IRISH_DIVIDEND",
  "US_DIVIDEND",
  "CANADIAN_DIVIDEND",
  "UK_DIVIDEND",
  "OTHER_FOREIGN_DIVIDEND",
] as const;
export type DividendTreatment = (typeof DIVIDEND_TREATMENTS)[number];

export const INTEREST_SOURCE_TYPES = [
  "IRISH_DEPOSIT",
  "EU_DEPOSIT",
  "NON_EU_DEPOSIT",
  "OTHER_INTEREST",
  "UNKNOWN",
] as const;
export type InterestSourceType = (typeof INTEREST_SOURCE_TYPES)[number];

export const CREDIT_TYPES = [
  "PERSONAL_TAX_CREDIT",
  "EMPLOYEE_TAX_CREDIT",
  "RENT_TAX_CREDIT",
  "HEALTH_EXPENSE_RELIEF",
  "TUITION_FEE_RELIEF",
  "PENSION_RELIEF",
  "FLAT_RATE_EXPENSE",
  "MANUAL_REVENUE_CREDIT",
] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];

export const CREDIT_STATUSES = [
  "AUTO_INCLUDED",
  "POTENTIALLY_ELIGIBLE",
  "USER_CONFIRMED",
  "ALREADY_CLAIMED",
  "NOT_ELIGIBLE",
] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const RESIDENCE_STATUSES = ["IRISH_RESIDENT", "OTHER"] as const;
export type ResidenceStatus = (typeof RESIDENCE_STATUSES)[number];

export const DOMICILE_STATUSES = ["IRISH_DOMICILED", "OTHER"] as const;
export type DomicileStatus = (typeof DOMICILE_STATUSES)[number];

export const ASSESSMENT_STATUSES = ["SINGLE_INDIVIDUAL", "UNSUPPORTED"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const CALCULATION_STATUSES = ["SUPPORTED", "PARTIAL", "UNSUPPORTED"] as const;
export type CalculationStatus = (typeof CALCULATION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const taxProfile = sqliteTable("tax_profile", {
  id: text("id").primaryKey(),
  taxYear: integer("tax_year").notNull(),
  residenceStatus: text("residence_status", { enum: RESIDENCE_STATUSES }).notNull(),
  domicileStatus: text("domicile_status", { enum: DOMICILE_STATUSES }).notNull(),
  assessmentStatus: text("assessment_status", { enum: ASSESSMENT_STATUSES }).notNull(),
  dateOfBirth: text("date_of_birth"),
  studentStatus: integer("student_status", { mode: "boolean" }).notNull().default(false),
  fullTimeStudent: integer("full_time_student", { mode: "boolean" }),
  unemployedAtYearEnd: integer("unemployed_at_year_end", { mode: "boolean" })
    .notNull()
    .default(false),
  unemploymentStartDate: text("unemployment_start_date"),
  receivesTaxableSocialWelfare: integer("receives_taxable_social_welfare", { mode: "boolean" })
    .notNull()
    .default(false),
  calculationStatus: text("calculation_status", { enum: CALCULATION_STATUSES }).notNull(),
});

export const revenueDocument = sqliteTable("revenue_document", {
  id: text("id").primaryKey(),
  documentType: text("document_type", { enum: REVENUE_DOCUMENT_TYPES }).notNull(),
  taxYear: integer("tax_year"),
  importedAt: text("imported_at").notNull(),
  parserVersion: text("parser_version").notNull(),
  parseStatus: text("parse_status", { enum: PARSE_STATUSES }).notNull(),
  // Raw PDFs are disposable by default; never persisted.
  rawFileRetained: integer("raw_file_retained", { mode: "boolean" }).notNull().default(false),
});

export const employmentRecord = sqliteTable(
  "employment_record",
  {
    id: text("id").primaryKey(),
    taxYear: integer("tax_year").notNull(),
    employerName: text("employer_name").notNull(),
    employerRegistrationNumber: text("employer_registration_number"),
    startDate: text("start_date"),
    endDate: text("end_date"),

    // Income figures, all canonical decimal strings. grossPay is not assumed
    // to equal payForIncomeTax or payForUsc (pension / BIK / allowances vary).
    grossPay: money("gross_pay").notNull(),
    payForIncomeTax: money("pay_for_income_tax").notNull(),
    payForUsc: money("pay_for_usc").notNull(),

    incomeTaxDeducted: money("income_tax_deducted").notNull(),
    uscDeducted: money("usc_deducted").notNull(),
    prsiDeducted: money("prsi_deducted").notNull(),

    // Pension contributions already relieved through payroll (reflected in
    // payForIncomeTax). Never relieved a second time by the pension-claim path.
    pensionContributionsPayrollRelieved: money("pension_contributions_payroll_relieved"),
    otherDeductionAmount: money("other_deduction_amount"),

    source: text("source", { enum: EMPLOYMENT_SOURCES }).notNull(),
    sourceDocumentId: text("source_document_id"),
    verifiedByUser: integer("verified_by_user", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("employment_tax_year_idx").on(table.taxYear)],
);

export const statementOfLiability = sqliteTable(
  "statement_of_liability",
  {
    id: text("id").primaryKey(),
    taxYear: integer("tax_year").notNull(),
    incomeTaxLiability: money("income_tax_liability"),
    uscLiability: money("usc_liability"),
    incomeTaxPaid: money("income_tax_paid"),
    uscPaid: money("usc_paid"),
    overpayment: money("overpayment"),
    underpayment: money("underpayment"),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => revenueDocument.id),
    verifiedByUser: integer("verified_by_user", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("statement_liability_tax_year_idx").on(table.taxYear)],
);

export const brokerAccount = sqliteTable("broker_account", {
  id: text("id").primaryKey(),
  broker: text("broker", { enum: BROKERS }).notNull(),
  displayName: text("display_name").notNull(),
  baseCurrency: text("base_currency"),
});

export const instrument = sqliteTable("instrument", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  isin: text("isin"),
  name: text("name"),
  currency: text("currency").notNull(),
  taxTreatment: text("tax_treatment", { enum: TAX_TREATMENTS }).notNull().default("UNKNOWN"),
  taxTreatmentConfirmedByUser: integer("tax_treatment_confirmed_by_user", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const importBatch = sqliteTable(
  "import_batch",
  {
    id: text("id").primaryKey(),
    // e.g. "TRADING_212_CSV", "REVENUE_EDS" - free text in the MVP.
    source: text("source").notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    importedCount: integer("imported_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
  },
  (table) => [index("import_batch_started_at_idx").on(table.startedAt)],
);

export const investmentTransaction = sqliteTable(
  "investment_transaction",
  {
    id: text("id").primaryKey(),
    brokerAccountId: text("broker_account_id")
      .notNull()
      .references(() => brokerAccount.id),
    instrumentId: text("instrument_id").references(() => instrument.id),

    transactionType: text("transaction_type", { enum: TRANSACTION_TYPES }).notNull(),
    timestamp: text("timestamp").notNull(),
    tradeDate: text("trade_date").notNull(),

    quantity: money("quantity"),
    unitPrice: money("unit_price"),
    grossAmount: money("gross_amount"),
    feeAmount: money("fee_amount"),
    withholdingTaxAmount: money("withholding_tax_amount"),

    currency: text("currency").notNull(),
    // EUR conversion per taxable event. Currency and EUR columns are kept
    // separate so original broker currency is never lost.
    eurFxRate: money("eur_fx_rate"),
    eurGrossAmount: money("eur_gross_amount"),
    eurFeeAmount: money("eur_fee_amount"),
    eurWithholdingTaxAmount: money("eur_withholding_tax_amount"),

    externalId: text("external_id"),
    importBatchId: text("import_batch_id")
      .notNull()
      .references(() => importBatch.id),
    rawDescription: text("raw_description"),

    reviewStatus: text("review_status", { enum: REVIEW_STATUSES })
      .notNull()
      .default("REQUIRES_REVIEW"),
  },
  (table) => [
    index("transaction_batch_idx").on(table.importBatchId),
    index("transaction_broker_idx").on(table.brokerAccountId),
    index("transaction_instrument_idx").on(table.instrumentId),
    // Dedup key: one broker + one broker-provided external id. NULL externalId
    // values are allowed to repeat under the fallback fingerprinted path.
    uniqueIndex("transaction_external_id_unique").on(table.brokerAccountId, table.externalId),
  ],
);

export const dividendIncome = sqliteTable(
  "dividend_income",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => investmentTransaction.id),
    taxYear: integer("tax_year").notNull(),
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instrument.id),

    jurisdiction: text("jurisdiction", { enum: DIVIDEND_JURISDICTIONS }).notNull(),
    grossEur: money("gross_eur").notNull(),
    foreignTaxWithheldEur: money("foreign_tax_withheld_eur").notNull().default("0"),
    irishDwtWithheldEur: money("irish_dwt_withheld_eur").notNull().default("0"),
    irishEncashmentTaxEur: money("irish_encashment_tax_eur").notNull().default("0"),

    treatment: text("treatment", { enum: DIVIDEND_TREATMENTS }).notNull(),
    verifiedByUser: integer("verified_by_user", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("dividend_tax_year_idx").on(table.taxYear)],
);

export const interestIncome = sqliteTable(
  "interest_income",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id").references(() => investmentTransaction.id),
    taxYear: integer("tax_year").notNull(),

    // Trading 212 cash interest defaults to UNKNOWN until the source
    // entity/jurisdiction is confirmed by the user.
    sourceType: text("source_type", { enum: INTEREST_SOURCE_TYPES }).notNull(),
    jurisdiction: text("jurisdiction"),

    grossEur: money("gross_eur").notNull(),
    taxWithheldEur: money("tax_withheld_eur").notNull().default("0"),

    verifiedByUser: integer("verified_by_user", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("interest_tax_year_idx").on(table.taxYear)],
);

export const creditClaim = sqliteTable(
  "credit_claim",
  {
    id: text("id").primaryKey(),
    taxYear: integer("tax_year").notNull(),

    type: text("type", { enum: CREDIT_TYPES }).notNull(),
    inputAmount: money("input_amount"),
    eligibleAmount: money("eligible_amount"),
    estimatedTaxValue: money("estimated_tax_value").notNull().default("0"),

    status: text("status", { enum: CREDIT_STATUSES }).notNull(),
    evidenceNote: text("evidence_note"),
  },
  (table) => [index("credit_claim_tax_year_idx").on(table.taxYear)],
);

export const calculationRun = sqliteTable(
  "calculation_run",
  {
    id: text("id").primaryKey(),
    taxYear: integer("tax_year").notNull(),
    rulesVersion: text("rules_version").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    inputFingerprint: text("input_fingerprint").notNull(),
    resultJson: text("result_json").notNull(),
  },
  (table) => [index("calculation_run_tax_year_idx").on(table.taxYear)],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const brokerAccountRelations = relations(brokerAccount, ({ many }) => ({
  transactions: many(investmentTransaction),
}));

export const investmentTransactionRelations = relations(investmentTransaction, ({ one }) => ({
  brokerAccount: one(brokerAccount, {
    fields: [investmentTransaction.brokerAccountId],
    references: [brokerAccount.id],
  }),
  instrument: one(instrument, {
    fields: [investmentTransaction.instrumentId],
    references: [instrument.id],
  }),
  dividend: one(dividendIncome, {
    fields: [investmentTransaction.id],
    references: [dividendIncome.transactionId],
  }),
  interest: one(interestIncome, {
    fields: [investmentTransaction.id],
    references: [interestIncome.transactionId],
  }),
}));

export const importBatchRelations = relations(importBatch, ({ many }) => ({
  transactions: many(investmentTransaction),
}));

export const revenueDocumentRelations = relations(revenueDocument, ({ many }) => ({
  statements: many(statementOfLiability),
}));

export const instrumentRelations = relations(instrument, ({ many }) => ({
  transactions: many(investmentTransaction),
  dividends: many(dividendIncome),
}));
