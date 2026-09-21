import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { dividendIncome, interestIncome, investmentTransaction } from "@/lib/db/schema";

export type InvestmentTransactionRow = typeof investmentTransaction.$inferSelect;
export type NewInvestmentTransaction = typeof investmentTransaction.$inferInsert;

export type DividendIncomeRow = typeof dividendIncome.$inferSelect;
export type NewDividendIncome = typeof dividendIncome.$inferInsert;

export type InterestIncomeRow = typeof interestIncome.$inferSelect;
export type NewInterestIncome = typeof interestIncome.$inferInsert;

export function insertInvestmentTransaction(
  db: AppDb,
  value: NewInvestmentTransaction,
): InvestmentTransactionRow {
  return db.insert(investmentTransaction).values(value).returning().get();
}

export function listTransactionsByBatch(db: AppDb, importBatchId: string): InvestmentTransactionRow[] {
  return db
    .select()
    .from(investmentTransaction)
    .where(eq(investmentTransaction.importBatchId, importBatchId))
    .all();
}

export function listTransactionsByBroker(db: AppDb, brokerAccountId: string): InvestmentTransactionRow[] {
  return db
    .select()
    .from(investmentTransaction)
    .where(eq(investmentTransaction.brokerAccountId, brokerAccountId))
    .all();
}

export function insertDividendIncome(db: AppDb, value: NewDividendIncome): DividendIncomeRow {
  return db.insert(dividendIncome).values(value).returning().get();
}

export function listDividendsByTaxYear(db: AppDb, taxYear: number): DividendIncomeRow[] {
  return db.select().from(dividendIncome).where(eq(dividendIncome.taxYear, taxYear)).all();
}

export function insertInterestIncome(db: AppDb, value: NewInterestIncome): InterestIncomeRow {
  return db.insert(interestIncome).values(value).returning().get();
}

export function listInterestByTaxYear(db: AppDb, taxYear: number): InterestIncomeRow[] {
  return db.select().from(interestIncome).where(eq(interestIncome.taxYear, taxYear)).all();
}