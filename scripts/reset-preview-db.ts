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
      console.log("Error details:", error.message);
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
    console.error(`Error code: ${error.code}`);
    console.error(`Error message: ${error.message}`);
    
    if (error.stack) {
      console.error("Stack trace:", error.stack);
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
        console.error("Error closing database connection:", closeError);
      }
    }
  }
  
  process.exit(0);
}

// Execute the script
resetPreviewDatabase().catch(err => {
  console.error("Failed to reset preview database:", err);
  console.error("Stack trace:", err.stack);
  process.exit(1);
}); 