import { env } from "../src/env.js";
import { resetDatabaseSchema, PostgresError } from "./db-utils.js";
import main from "./migrate.js";

/**
 * This script resets and migrates the database - giving a fresh start
 */
async function runFreshMigration() {
  const dbUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;

  if (!dbUrl) {
    console.error("No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)");
    process.exit(1);
  }

  try {
    // Reset the database schema (drops and recreates tables)
    await resetDatabaseSchema(dbUrl, { 
      // Don't run migrations here, we'll do it manually afterwards
      runMigrations: false
    });
    
    // Now run the improved migration function
    await main();
    
    console.log("✅ Database reset and migrations completed successfully");
  } catch (error) {
    console.error("Failed to reset database:", error);
    const pgError = error as PostgresError;
    console.error(`Error message: ${pgError.message || String(error)}`);
    process.exit(1);
  }

  process.exit(0);
}

runFreshMigration().catch((err) => {
  console.error("Failed to reset database:", err);
  process.exit(1); 
}); 