import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { taxProfile } from "@/lib/db/schema";

export type TaxProfileRecord = typeof taxProfile.$inferSelect;
export type NewTaxProfile = typeof taxProfile.$inferInsert;

export function getProfileByTaxYear(db: AppDb, taxYear: number): TaxProfileRecord | undefined {
  return db.select().from(taxProfile).where(eq(taxProfile.taxYear, taxYear)).get();
}

export function listProfiles(db: AppDb): TaxProfileRecord[] {
  return db.select().from(taxProfile).all();
}

export function upsertProfile(
  db: AppDb,
  id: string,
  value: Omit<NewTaxProfile, "id">,
): TaxProfileRecord {
  return db
    .insert(taxProfile)
    .values({ ...value, id })
    .onConflictDoUpdate({
      target: taxProfile.id,
      set: { ...value },
    })
    .returning()
    .get();
}
