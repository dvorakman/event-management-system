import postgres from "postgres";
import { env } from "~/env";

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

  console.log("🔄 Resetting preview database schema...");
  
  try {
    // Create a new database connection
    const sql = postgres(dbUrl, { max: 1 });
    
    // Drop the public schema (cascades to all objects within it)
    // Then recreate the public schema
    await sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`;
    
    console.log("✅ Preview database schema reset successfully");
    
    // Close the database connection
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting preview database:", error);
    process.exit(1);
  }
}

// Execute the script
resetPreviewDatabase().catch(err => {
  console.error("Failed to reset preview database:", err);
  process.exit(1);
}); 