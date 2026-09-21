import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { revenueDocument, statementOfLiability } from "@/lib/db/schema";

export type RevenueDocumentRow = typeof revenueDocument.$inferSelect;
export type NewRevenueDocument = typeof revenueDocument.$inferInsert;

export type StatementOfLiabilityRow = typeof statementOfLiability.$inferSelect;
export type NewStatementOfLiability = typeof statementOfLiability.$inferInsert;

export function insertRevenueDocument(db: AppDb, value: NewRevenueDocument): RevenueDocumentRow {
  return db.insert(revenueDocument).values(value).returning().get();
}

export function getRevenueDocumentById(db: AppDb, id: string): RevenueDocumentRow | undefined {
  return db.select().from(revenueDocument).where(eq(revenueDocument.id, id)).get();
}

export function listRevenueDocuments(db: AppDb): RevenueDocumentRow[] {
  return db.select().from(revenueDocument).all();
}

export function insertStatementOfLiability(
  db: AppDb,
  value: NewStatementOfLiability,
): StatementOfLiabilityRow {
  return db.insert(statementOfLiability).values(value).returning().get();
}

export function listStatementsByTaxYear(db: AppDb, taxYear: number): StatementOfLiabilityRow[] {
  return db
    .select()
    .from(statementOfLiability)
    .where(eq(statementOfLiability.taxYear, taxYear))
    .all();
}