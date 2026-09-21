import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createRawDb, getRawDb } from "@/lib/db/connection";
import * as schema from "@/lib/db/schema";

export type AppDb = BetterSQLite3Database<typeof schema>;

let appDb: AppDb | undefined;

/**
 * Shared Drizzle instance backed by the local SQLite file.
 *
 * No `server-only` guard here on purpose: repository/integration tests run
 * under Vitest. The Node-only nature of better-sqlite3 keeps this off the
 * client bundle; keep every DB import out of client components.
 */
export function getDb(): AppDb {
  if (!appDb) appDb = drizzle(getRawDb(), { schema });
  return appDb;
}

/** Standalone Drizzle instance for tests and scripts pointing at an explicit file. */
export function createAppDb(dbPath?: string): AppDb {
  if (dbPath) return drizzle(createRawDb(dbPath), { schema });
  return drizzle(getRawDb(), { schema });
}