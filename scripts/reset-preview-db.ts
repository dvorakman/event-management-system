import postgres from "postgres";
import { env } from "~/env";

// Explicitly declare types for error handling to avoid TypeScript errors
interface PostgresError extends Error {
  code?: string;
  severity?: string;
  message: string;
  stack?: string;
  detail?: string;
}

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

  // Mask the password in the connection string for logging
  const maskedDbUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log(`🔄 Resetting preview database schema using: ${maskedDbUrl}`);
  
  let sql;
  try {
    // Create a new database connection
    console.log("Establishing database connection...");
    sql = postgres(dbUrl, { 
      max: 1,
      timeout: 10,
      debug: true  // Enable debug logging
    });
    
    // Test the connection with a simple query
    console.log("Testing database connection...");
    await sql`SELECT 1 AS connection_test`;
    console.log("Connection successful!");
    
    // Execute DROP and CREATE commands separately to avoid prepared statement issues
    try {
      console.log("Dropping public schema...");
      await sql`DROP SCHEMA public CASCADE`;
      console.log("Public schema dropped successfully");
    } catch (error) {
      // Ignore errors if schema doesn't exist - this might be the first run
      console.log("Note: Could not drop schema, it may not exist yet.");
      const pgError = error as PostgresError;
      console.log("Error details:", pgError.message || "Unknown error");
    }
    
    try {
      console.log("Creating public schema...");
      await sql`CREATE SCHEMA public`;
      console.log("Public schema created successfully");
    } catch (error) {
      // If we can't create the schema, this is a real error we should report
      console.error("Failed to create schema:", error);
      throw error;
    }
    
    console.log("✅ Preview database schema reset successfully");
    
  } catch (error) {
    console.error("❌ Error resetting preview database:");
    const pgError = error as PostgresError;
    
    if (pgError.code) {
      console.error(`Error code: ${pgError.code}`);
    }
    
    console.error(`Error message: ${pgError.message || String(error)}`);
    
    if (pgError.stack) {
      console.error("Stack trace:", pgError.stack);
    }
    
    process.exit(1);
  } finally {
    // Always try to close the connection
    if (sql) {
      console.log("Closing database connection...");
      try {
        await sql.end();
        console.log("Database connection closed");
      } catch (closeError) {
        const pgCloseError = closeError as PostgresError;
        console.error("Error closing database connection:", pgCloseError.message || String(closeError));
      }
    }
  }
  
  process.exit(0);
}

// Execute the script
resetPreviewDatabase().catch((err) => {
  console.error("Failed to reset preview database:", err);
  const pgError = err as PostgresError;
  console.error("Stack trace:", pgError.stack || "No stack trace available");
  process.exit(1);
}); 