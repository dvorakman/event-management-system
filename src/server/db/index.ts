import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./schema";
import { env } from "~/env";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: unknown;
  db: unknown;
};

// Check if we have a Neon database URL configured
const hasNeonDb = !!env.NEON_DATABASE_URL;

if (!globalForDb.db) {
  if (hasNeonDb && env.NEON_DATABASE_URL) {
    // Connect to Neon serverless PostgreSQL database
    console.log("Using Neon serverless PostgreSQL database");
    const conn = neon(env.NEON_DATABASE_URL);
    globalForDb.conn = conn;
    globalForDb.db = drizzle(conn, { schema });
  } else if (env.DATABASE_URL) {
    // Connect to PostgreSQL database specified in DATABASE_URL
    // This will be the local database during development
    console.log("Using PostgreSQL database from DATABASE_URL");
    const conn = postgres(env.DATABASE_URL);
    globalForDb.conn = conn;
    globalForDb.db = drizzleNode(conn, { schema });
  } else {
    throw new Error(
      "No database connection URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)"
    );
  }
}

export const db = globalForDb.db as ReturnType<typeof drizzle>;
