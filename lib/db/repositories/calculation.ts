import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { calculationRun } from "@/lib/db/schema";

export type CalculationRunRow = typeof calculationRun.$inferSelect;
export type NewCalculationRun = typeof calculationRun.$inferInsert;

export function insertCalculationRun(db: AppDb, value: NewCalculationRun): CalculationRunRow {
  return db.insert(calculationRun).values(value).returning().get();
}

export function listCalculationRunsByTaxYear(db: AppDb, taxYear: number): CalculationRunRow[] {
  return db
    .select()
    .from(calculationRun)
    .where(eq(calculationRun.taxYear, taxYear))
    .orderBy(calculationRun.createdAt)
    .all();
}