import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { creditClaim } from "@/lib/db/schema";

export type CreditClaimRow = typeof creditClaim.$inferSelect;
export type NewCreditClaim = typeof creditClaim.$inferInsert;

export function insertCreditClaim(db: AppDb, value: NewCreditClaim): CreditClaimRow {
  return db.insert(creditClaim).values(value).returning().get();
}

export function listCreditClaimsByTaxYear(db: AppDb, taxYear: number): CreditClaimRow[] {
  return db.select().from(creditClaim).where(eq(creditClaim.taxYear, taxYear)).all();
}

export function updateCreditClaim(
  db: AppDb,
  id: string,
  value: Partial<Omit<NewCreditClaim, "id">>,
): CreditClaimRow | undefined {
  return db.update(creditClaim).set(value).where(eq(creditClaim.id, id)).returning().get();
}