import { env } from "../src/env";
import { resetDatabaseSchema, PostgresError } from "./db-utils";

/**
 * This script resets the database schema for preview environments
 * It drops and recreates the public schema, giving us a clean slate for migrations
 * Only runs in Vercel preview environments to avoid affecting production
 */
async function resetPreviewDatabase() {
  // Only run in preview environments
  const isPreviewEnv = process.env.VERCEL_ENV === "preview";
  
  if (!isPreviewEnv) {
    console.log("Not a preview environment, skipping database reset");
    process.exit(0);
    return;
  }

  // Get the database URL (preferring Neon for previews)
  const dbUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error("No database URL provided. Cannot reset the database.");
    process.exit(1);
    return;
  }

  try {
    // Run migrations is true by default and masked URL logging is enabled
    await resetDatabaseSchema(dbUrl);
    console.log("✅ Preview database schema reset successfully");
  } catch (error) {
    console.error("Failed to reset preview database:", error);
    const pgError = error as PostgresError;
    console.error(`Error message: ${pgError.message || String(error)}`);
    process.exit(1);
  }

  process.exit(0);
}

// Execute the script
resetPreviewDatabase().catch((err) => {
  console.error("Failed to reset preview database:", err);
  const pgError = err as PostgresError;
  console.error(`Error message: ${pgError.message || String(err)}`);
  process.exit(1);
}); 