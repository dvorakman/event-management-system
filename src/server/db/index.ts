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

// Check if we're in build mode (Vercel or local build)
const isBuildMode = process.env.NODE_ENV === 'production' || 
                   process.env.VERCEL_ENV === 'production' || 
                   process.env.VERCEL_ENV === 'preview' ||
                   process.env.NEXT_PHASE === 'phase-production-build';

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
  } else if (isBuildMode) {
    // If we're in build mode and no database is available, use a mock database
    // This allows builds to complete without a real database
    console.log("Using mock database for build - no real database connection");
    
    // Create a proxy object that mimics the database interface but returns empty results
    globalForDb.db = new Proxy({}, {
      get: (target, prop) => {
        // For common query methods, return a function that returns empty results
        if (['query', 'select', 'insert', 'update', 'delete'].includes(prop as string)) {
          return new Proxy({}, {
            get: () => async () => [] // Return empty array for any query
          });
        }
        return () => {}; // Return no-op function for other methods
      }
    });
  } else {
    throw new Error(
      "No database connection URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)"
    );
  }
}

export const db = globalForDb.db as ReturnType<typeof drizzle> | ReturnType<typeof drizzleNode>;
