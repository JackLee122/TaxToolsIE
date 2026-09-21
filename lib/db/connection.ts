import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/** Resolve the SQLite file location. Relative env values resolve from the project root. */
export function resolveDbPath(): string {
  const configured = process.env.SQLITE_DB_PATH;
  if (configured) return path.resolve(process.cwd(), configured);
  return path.join(process.cwd(), "data", "taxtoolie.db");
}

/** Open a raw better-sqlite3 connection, creating the file/directory if needed. */
export function createRawDb(dbPath?: string): Database.Database {
  const resolved = dbPath ?? resolveDbPath();
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// Cache one raw connection per resolved path so server actions and pages share
// a single writer and WAL checkpoint.
const rawConnections = new Map<string, Database.Database>();

export function getRawDb(): Database.Database {
  const resolved = resolveDbPath();
  const existing = rawConnections.get(resolved);
  if (existing) return existing;
  const db = createRawDb(resolved);
  rawConnections.set(resolved, db);
  return db;
}