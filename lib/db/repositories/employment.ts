import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { employmentRecord } from "@/lib/db/schema";

export type EmploymentRecordRow = typeof employmentRecord.$inferSelect;
export type NewEmploymentRecord = typeof employmentRecord.$inferInsert;

export function listEmploymentByTaxYear(db: AppDb, taxYear: number): EmploymentRecordRow[] {
  return db.select().from(employmentRecord).where(eq(employmentRecord.taxYear, taxYear)).all();
}

export function getEmploymentById(db: AppDb, id: string): EmploymentRecordRow | undefined {
  return db.select().from(employmentRecord).where(eq(employmentRecord.id, id)).get();
}

export function insertEmployment(db: AppDb, value: NewEmploymentRecord): EmploymentRecordRow {
  return db.insert(employmentRecord).values(value).returning().get();
}

export function updateEmployment(
  db: AppDb,
  id: string,
  value: Omit<NewEmploymentRecord, "id">,
): EmploymentRecordRow | undefined {
  return db
    .update(employmentRecord)
    .set(value)
    .where(eq(employmentRecord.id, id))
    .returning()
    .get();
}

export function deleteEmployment(db: AppDb, id: string): void {
  db.delete(employmentRecord).where(eq(employmentRecord.id, id)).run();
}