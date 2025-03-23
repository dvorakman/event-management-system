import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";

// Define PostgresError type for better error handling
export type PostgresError = {
  code?: string;
  message?: string;
  stack?: string;
};

/**
 * Reset a database schema by dropping and recreating the public schema
 * Works with both Neon and standard PostgreSQL databases
 */
export async function resetDatabaseSchema(dbUrl: string, options: {
  runMigrations?: boolean;
  logMaskedUrl?: boolean;
} = {}) {
  const { runMigrations = true, logMaskedUrl = true } = options;

  if (!dbUrl) {
    throw new Error(
      "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)"
    );
  }

  // Mask the password in the connection string for logging
  if (logMaskedUrl) {
    const maskedDbUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    console.log(`🔄 Resetting database schema using: ${maskedDbUrl}`);
  }

  // Check if we're using Neon
  const isNeon = dbUrl.includes('neon.tech');
  
  try {
    if (isNeon) {
      await resetNeonSchema(dbUrl);
      
      // Run migrations if requested
      if (runMigrations) {
        console.log("Running migrations...");
        const client = neon(dbUrl);
        const db = drizzleNeon(client);
        await migrateNeon(db, {
          migrationsFolder: "drizzle/migrations",
        });
      }
    } else {
      await resetPostgresSchema(dbUrl);
      
      // Run migrations if requested
      if (runMigrations) {
        console.log("Running migrations...");
        const sql = postgres(dbUrl, { max: 1 });
        const db = drizzle(sql);
        await migrate(db, {
          migrationsFolder: "drizzle/migrations",
        });
        
        // Close the database connection
        console.log("Closing database connection...");
        await sql.end();
      }
    }
    
    console.log("✅ Database schema reset successfully");
    return true;
  } catch (error) {
    console.error("❌ Database reset failed:");
    const pgError = error as PostgresError;
    
    if (pgError.code) {
      console.error(`Error code: ${pgError.code}`);
    }
    
    console.error(`Error message: ${pgError.message || String(error)}`);
    
    if (pgError.stack) {
      console.error("Stack trace:", pgError.stack);
    }
    
    throw error;
  }
}

/**
 * Reset Neon database schema
 */
async function resetNeonSchema(dbUrl: string) {
  const client = neon(dbUrl);
  
  console.log("Resetting Neon database schema...");
  
  try {
    console.log("Dropping public schema...");
    await client`DROP SCHEMA public CASCADE`;
    console.log("Public schema dropped successfully");
  } catch (error) {
    // Ignore errors if schema doesn't exist
    console.log("Note: Could not drop schema, it may not exist yet.");
    const pgError = error as PostgresError;
    console.log("Error details:", pgError.message || "Unknown error");
  }
  
  try {
    console.log("Creating public schema...");
    await client`CREATE SCHEMA public`;
    console.log("Public schema created successfully");
  } catch (error) {
    console.error("Failed to create schema:", error);
    throw error;
  }
}

/**
 * Reset standard PostgreSQL schema
 */
async function resetPostgresSchema(dbUrl: string) {
  let sql: ReturnType<typeof postgres> | undefined;
  
  try {
    // Create a new database connection
    console.log("Establishing database connection...");
    sql = postgres(dbUrl, { 
      max: 1,
      timeout: 10
    });
    
    // Test the connection with a simple query
    console.log("Testing database connection...");
    await sql`SELECT 1 AS connection_test`;
    console.log("Connection successful!");
    
    // Execute DROP and CREATE commands separately
    try {
      console.log("Dropping public schema...");
      await sql`DROP SCHEMA public CASCADE`;
      console.log("Public schema dropped successfully");
    } catch (error) {
      // Ignore errors if schema doesn't exist
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
  } catch (error) {
    throw error;
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
} 