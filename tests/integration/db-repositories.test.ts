import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRawDb } from "@/lib/db/connection";
import * as schema from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/db";
import { getProfileByTaxYear, upsertProfile } from "@/lib/db/repositories/tax-profile";
import {
  deleteEmployment,
  insertEmployment,
  listEmploymentByTaxYear,
} from "@/lib/db/repositories/employment";
import {
  insertBrokerAccount,
  insertInstrument,
  listInstruments,
} from "@/lib/db/repositories/broker";
import {
  insertImportBatch,
  completeImportBatch,
  listImportBatches,
} from "@/lib/db/repositories/batches";
import {
  insertInvestmentTransaction,
  insertDividendIncome,
  insertInterestIncome,
  listTransactionsByBatch,
  listDividendsByTaxYear,
  listInterestByTaxYear,
} from "@/lib/db/repositories/transactions";
import { insertCreditClaim, listCreditClaimsByTaxYear } from "@/lib/db/repositories/credits";
import { insertRevenueDocument, insertStatementOfLiability } from "@/lib/db/repositories/documents";

describe("domain repositories", () => {
  let dbPath: string;
  let db: AppDb;
  let raw: ReturnType<typeof createRawDb>;

  beforeAll(() => {
    dbPath = path.join(os.tmpdir(), `taxtoolie-test-${randomUUID()}.db`);
    raw = createRawDb(dbPath);
    db = drizzle(raw, { schema });
    // Migrate the test database from the generated migration files.
    migrate(db, { migrationsFolder: path.resolve("drizzle") });
  });

  afterAll(() => {
    raw.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.unlinkSync(`${dbPath}${suffix}`);
      } catch {
        // ignore missing sidecar files
      }
    }
  });

  it("employment money values round-trip as exact decimal strings", () => {
    const taxYear = 2026;
    const record = insertEmployment(db, {
      id: randomUUID(),
      taxYear,
      employerName: "Test Employer Ltd",
      employerRegistrationNumber: "1234567H",
      startDate: "2026-01-01",
      endDate: null,
      grossPay: "123456.78",
      payForIncomeTax: "0.12345678901234567890",
      payForUsc: "100000.01",
      incomeTaxDeducted: "30120.34",
      uscDeducted: "2345.67",
      prsiDeducted: "4567.89",
      pensionContributionsPayrollRelieved: "5000.00",
      otherDeductionAmount: null,
      source: "MANUAL",
      sourceDocumentId: null,
      verifiedByUser: true,
    });

    expect(record.grossPay).toBe("123456.78");
    expect(record.payForIncomeTax).toBe("0.12345678901234567890");

    const stored = listEmploymentByTaxYear(db, taxYear)[0];
    expect(stored.grossPay).toBe("123456.78");
    expect(stored.payForIncomeTax).toBe("0.12345678901234567890");
    expect(stored.payForUsc).toBe("100000.01");
    expect(stored.incomeTaxDeducted).toBe("30120.34");
    expect(stored.uscDeducted).toBe("2345.67");
    expect(stored.prsiDeducted).toBe("4567.89");
    expect(stored.pensionContributionsPayrollRelieved).toBe("5000.00");
    expect(stored.verifiedByUser).toBe(true);
    // Remove test row so the tax year remains clean for other assertions.
    deleteEmployment(db, stored.id);
  });

  it("tax profile upserts", () => {
    const id = randomUUID();
    upsertProfile(db, id, {
      taxYear: 2026,
      residenceStatus: "IRISH_RESIDENT",
      domicileStatus: "IRISH_DOMICILED",
      assessmentStatus: "SINGLE_INDIVIDUAL",
      dateOfBirth: "1990-05-01",
      studentStatus: false,
      fullTimeStudent: null,
      unemployedAtYearEnd: false,
      unemploymentStartDate: null,
      receivesTaxableSocialWelfare: false,
      calculationStatus: "SUPPORTED",
    });
    const profile = getProfileByTaxYear(db, 2026);
    expect(profile?.calculationStatus).toBe("SUPPORTED");
    expect(profile?.domicileStatus).toBe("IRISH_DOMICILED");
  });

  it("brokers, instruments and default UNKNOWN treatment", () => {
    const broker = insertBrokerAccount(db, {
      id: randomUUID(),
      broker: "TRADING_212",
      displayName: "Trading 212",
      baseCurrency: "EUR",
    });
    insertInstrument(db, {
      id: randomUUID(),
      symbol: "VUSA",
      isin: "IE00B3XXRP09",
      name: "Vanguard S&P 500 ETF",
      currency: "GBP",
      taxTreatment: "UNKNOWN",
      taxTreatmentConfirmedByUser: false,
    });
    expect(broker.broker).toBe("TRADING_212");
    const instruments = listInstruments(db);
    expect(instruments).toHaveLength(1);
    expect(instruments[0].taxTreatment).toBe("UNKNOWN");
    expect(instruments[0].taxTreatmentConfirmedByUser).toBe(false);
  });

  it("import batch, buy transaction with FX and dedupe by external id", () => {
    const batch = insertImportBatch(db, {
      id: randomUUID(),
      source: "TRADING_212_CSV",
      startedAt: new Date().toISOString(),
      completedAt: null,
      importedCount: 0,
      duplicateCount: 0,
      reviewCount: 0,
      errorCount: 0,
    });
    const broker = insertBrokerAccount(db, {
      id: randomUUID(),
      broker: "TRADING_212",
      displayName: "Trading 212",
      baseCurrency: "EUR",
    });
    const instrument = insertInstrument(db, {
      id: randomUUID(),
      symbol: "AAPL",
      currency: "USD",
      taxTreatment: "UNKNOWN",
      taxTreatmentConfirmedByUser: false,
    });

    const tx = insertInvestmentTransaction(db, {
      id: randomUUID(),
      brokerAccountId: broker.id,
      instrumentId: instrument.id,
      transactionType: "BUY",
      timestamp: "2026-03-10T10:00:00.000Z",
      tradeDate: "2026-03-10",
      quantity: "10.5",
      unitPrice: "190.42",
      grossAmount: "1999.41",
      feeAmount: "1.00",
      withholdingTaxAmount: null,
      currency: "USD",
      eurFxRate: "0.912300",
      eurGrossAmount: "1823.84",
      eurFeeAmount: "0.91",
      eurWithholdingTaxAmount: null,
      externalId: "T212-BUY-001",
      importBatchId: batch.id,
      rawDescription: "Buy 10.5 AAPL @ $190.42",
      reviewStatus: "CONFIRMED",
    });

    expect(tx.quantity).toBe("10.5");
    expect(tx.eurGrossAmount).toBe("1823.84");
    const listed = listTransactionsByBatch(db, batch.id);
    expect(listed).toHaveLength(1);

    // Reinserting the same external id for the same broker must be rejected.
    expect(() =>
      insertInvestmentTransaction(db, {
        id: randomUUID(),
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        transactionType: "BUY",
        timestamp: "2026-03-10T10:00:00.000Z",
        tradeDate: "2026-03-10",
        quantity: "10.5",
        unitPrice: "190.42",
        grossAmount: "1999.41",
        feeAmount: null,
        withholdingTaxAmount: null,
        currency: "USD",
        eurFxRate: "0.912300",
        eurGrossAmount: "1823.84",
        eurFeeAmount: null,
        eurWithholdingTaxAmount: null,
        externalId: "T212-BUY-001",
        importBatchId: batch.id,
        rawDescription: "Dup",
        reviewStatus: "CONFIRMED",
      }),
    ).toThrow(/UNIQUE/i);

    completeImportBatch(
      db,
      batch.id,
      {
        importedCount: 1,
        duplicateCount: 1,
        reviewCount: 0,
        errorCount: 0,
      },
      new Date().toISOString(),
    );
    const completed = listImportBatches(db)[0];
    expect(completed?.duplicateCount).toBe(1);
    expect(completed?.completedAt).toBeTruthy();
  });

  it("dividend and interest income round-trip with verified flags", () => {
    const broker = insertBrokerAccount(db, {
      id: randomUUID(),
      broker: "GENERIC",
      displayName: "Test",
      baseCurrency: "EUR",
    });
    const instrument = insertInstrument(db, {
      id: randomUUID(),
      symbol: "MSFT",
      currency: "USD",
      taxTreatment: "SHARE_CGT",
      taxTreatmentConfirmedByUser: true,
    });
    const batch = insertImportBatch(db, {
      id: randomUUID(),
      source: "GENERIC_CSV",
      startedAt: new Date().toISOString(),
      completedAt: null,
      importedCount: 0,
      duplicateCount: 0,
      reviewCount: 0,
      errorCount: 0,
    });
    const dividendTx = insertInvestmentTransaction(db, {
      id: randomUUID(),
      brokerAccountId: broker.id,
      instrumentId: instrument.id,
      transactionType: "DIVIDEND",
      timestamp: "2026-06-01T00:00:00.000Z",
      tradeDate: "2026-06-01",
      grossAmount: "100.00",
      currency: "USD",
      eurGrossAmount: "92.00",
      importBatchId: batch.id,
      reviewStatus: "REQUIRES_REVIEW",
    });

    const dividend = insertDividendIncome(db, {
      id: randomUUID(),
      transactionId: dividendTx.id,
      taxYear: 2026,
      instrumentId: instrument.id,
      jurisdiction: "USA",
      grossEur: "92.00",
      foreignTaxWithheldEur: "13.80",
      irishDwtWithheldEur: "0",
      irishEncashmentTaxEur: "0",
      treatment: "US_DIVIDEND",
      verifiedByUser: false,
    });
    expect(dividend.grossEur).toBe("92.00");
    expect(dividend.foreignTaxWithheldEur).toBe("13.80");

    const interest = insertInterestIncome(db, {
      id: randomUUID(),
      transactionId: null,
      taxYear: 2026,
      sourceType: "IRISH_DEPOSIT",
      jurisdiction: "IE",
      grossEur: "25.50",
      taxWithheldEur: "8.42",
      verifiedByUser: true,
    });
    expect(interest.sourceType).toBe("IRISH_DEPOSIT");
    expect(interest.taxWithheldEur).toBe("8.42");

    const dividends = listDividendsByTaxYear(db, 2026);
    const interests = listInterestByTaxYear(db, 2026);
    expect(dividends).toHaveLength(1);
    expect(interests).toHaveLength(1);
  });

  it("credit claims and revenue documents preserve strings", () => {
    const claim = insertCreditClaim(db, {
      id: randomUUID(),
      taxYear: 2026,
      type: "RENT_TAX_CREDIT",
      inputAmount: "10000.00",
      eligibleAmount: "8400.00",
      estimatedTaxValue: "1680.00",
      status: "POTENTIALLY_ELIGIBLE",
      evidenceNote: "Tenancy agreement",
    });
    expect(claim.estimatedTaxValue).toBe("1680.00");
    const claims = listCreditClaimsByTaxYear(db, 2026);
    expect(claims.some((c) => c.type === "RENT_TAX_CREDIT")).toBe(true);

    const doc = insertRevenueDocument(db, {
      id: randomUUID(),
      documentType: "EMPLOYMENT_DETAIL_SUMMARY",
      taxYear: 2026,
      importedAt: new Date().toISOString(),
      parserVersion: "0.0.0",
      parseStatus: "PARSED",
      rawFileRetained: false,
    });
    const statement = insertStatementOfLiability(db, {
      id: randomUUID(),
      taxYear: 2026,
      incomeTaxLiability: "15320.00",
      uscLiability: "2650.00",
      incomeTaxPaid: "16100.00",
      uscPaid: "2600.00",
      overpayment: "730.00",
      underpayment: null,
      sourceDocumentId: doc.id,
      verifiedByUser: true,
    });
    expect(statement.overpayment).toBe("730.00");
    expect(doc.rawFileRetained).toBe(false);
  });
});
