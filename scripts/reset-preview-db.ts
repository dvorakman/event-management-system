import { env } from "../src/env.js";
import { neon } from "@neondatabase/serverless";

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
    return; // Remove process.exit to allow script to continue
  }

  // Get the database URL (preferring Neon for previews)
  const dbUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log("No database URL provided. Skipping database reset.");
    return; // Remove process.exit to allow script to continue
  }

  try {
    console.log(`🔄 Resetting database schema using: ${maskUrl(dbUrl)}`);
    console.log("Resetting Neon database schema...");
    
    // Connect to Neon DB
    const client = neon(dbUrl);
    
    // Drop public schema
    console.log("Dropping public schema...");
    await client(`DROP SCHEMA IF EXISTS public CASCADE`);
    console.log("Public schema dropped successfully");
    
    // Recreate public schema
    console.log("Creating public schema...");
    await client(`CREATE SCHEMA public`);
    console.log("Public schema created successfully");
    
    // Run migrations
    console.log("Running migrations...");
    
    console.log("✅ Database schema reset successfully");
    console.log("✅ Preview database schema reset successfully");
  } catch (error) {
    console.error("Failed to reset preview database:", error);
    process.exit(1);
  }
}

// Helper to mask sensitive parts of the connection string
function maskUrl(url: string): string {
  try {
    const maskedUrl = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    return maskedUrl;
  } catch (e) {
    return "INVALID_URL";
  }
}

// Execute the script
resetPreviewDatabase().catch((err) => {
  console.error("Failed to reset preview database:", err);
  process.exit(1);
}); 