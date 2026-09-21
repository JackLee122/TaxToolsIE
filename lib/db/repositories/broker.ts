import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/db";
import { brokerAccount, instrument, type TaxTreatment } from "@/lib/db/schema";

export type BrokerAccountRow = typeof brokerAccount.$inferSelect;
export type NewBrokerAccount = typeof brokerAccount.$inferInsert;

export type InstrumentRow = typeof instrument.$inferSelect;
export type NewInstrument = typeof instrument.$inferInsert;

export function insertBrokerAccount(db: AppDb, value: NewBrokerAccount): BrokerAccountRow {
  return db.insert(brokerAccount).values(value).returning().get();
}

export function listBrokerAccounts(db: AppDb): BrokerAccountRow[] {
  return db.select().from(brokerAccount).all();
}

export function getBrokerAccountById(db: AppDb, id: string): BrokerAccountRow | undefined {
  return db.select().from(brokerAccount).where(eq(brokerAccount.id, id)).get();
}

export function insertInstrument(db: AppDb, value: NewInstrument): InstrumentRow {
  return db.insert(instrument).values(value).returning().get();
}

export function listInstruments(db: AppDb): InstrumentRow[] {
  return db.select().from(instrument).all();
}

export function getInstrumentById(db: AppDb, id: string): InstrumentRow | undefined {
  return db.select().from(instrument).where(eq(instrument.id, id)).get();
}

export function updateInstrumentTaxTreatment(
  db: AppDb,
  id: string,
  taxTreatment: TaxTreatment,
  confirmedByUser: boolean,
): InstrumentRow | undefined {
  return db
    .update(instrument)
    .set({ taxTreatment, taxTreatmentConfirmedByUser: confirmedByUser })
    .where(and(eq(instrument.id, id)))
    .returning()
    .get();
}