import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { importBatch } from "@/lib/db/schema";

export type ImportBatchRow = typeof importBatch.$inferSelect;
export type NewImportBatch = typeof importBatch.$inferInsert;

export function insertImportBatch(db: AppDb, value: NewImportBatch): ImportBatchRow {
  return db.insert(importBatch).values(value).returning().get();
}

export function listImportBatches(db: AppDb): ImportBatchRow[] {
  return db.select().from(importBatch).orderBy(importBatch.startedAt).all();
}

export function completeImportBatch(
  db: AppDb,
  id: string,
  counts: Pick<NewImportBatch, "importedCount" | "duplicateCount" | "reviewCount" | "errorCount">,
  completedAt: string,
): ImportBatchRow | undefined {
  return db
    .update(importBatch)
    .set({ ...counts, completedAt })
    .where(eq(importBatch.id, id))
    .returning()
    .get();
}