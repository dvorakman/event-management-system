import { drizzle } from "drizzle-orm/better-sqlite3";
import BetterSQLite3 from "better-sqlite3";
import { createClient } from "@libsql/client";
import { drizzle as drizzleTurso } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: unknown;
  db: unknown;
};

// Check if we have a remote Turso database URL configured
const hasTursoDb = !!process.env.DATABASE_URL?.includes("turso.io");

if (!globalForDb.db) {
  if (hasTursoDb && process.env.DATABASE_URL) {
    // Connect to remote Turso SQLite database
    console.log("Using remote Turso SQLite database");
    const client = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    globalForDb.conn = client;
    globalForDb.db = drizzleTurso(client, { schema });
  } else if (process.env.DATABASE_URL) {
    // Connect to local SQLite database
    console.log("Using local SQLite database");
    const dbPath = process.env.DATABASE_URL.replace("file:", "");
    const sqlite = new BetterSQLite3(dbPath);
    globalForDb.conn = sqlite;
    globalForDb.db = drizzle(sqlite, { schema });
  } else {
    throw new Error(
      "No database connection URL provided. Set DATABASE_URL in your .env file.",
    );
  }
}

export const db = globalForDb.db as
  | ReturnType<typeof drizzle>
  | ReturnType<typeof drizzleTurso>;
