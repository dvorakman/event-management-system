import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { env } from "../src/env.js";
import fs from 'fs';
import path from 'path';

// This script runs migrations on the database

async function main() {
  const dbUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error(
      "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)",
    );
  }

  console.log("🔄 Running migrations...");

  try {
    // Check if we're using Neon
    const isNeon = !!env.NEON_DATABASE_URL && env.NEON_DATABASE_URL === dbUrl;

    if (isNeon) {
      // Using Neon serverless PostgreSQL
      console.log("Using Neon serverless PostgreSQL");
      
      // Skip Drizzle migrator and use direct SQL execution
      console.log("Using direct SQL execution for Neon...");
      await executeNeonMigrationsSql(dbUrl);
    } else {
      // Using standard PostgreSQL
      console.log("Using standard PostgreSQL");
      
      // Skip Drizzle migrator and use direct SQL execution
      console.log("Using direct SQL execution for PostgreSQL...");
      await executePostgresMigrationsSql(dbUrl);
    }

    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

/**
 * Execute migrations by directly running SQL files for standard PostgreSQL
 */
async function executePostgresMigrationsSql(dbUrl: string) {
  const sql = postgres(dbUrl, { max: 1 });
  
  try {
    console.log('Manually executing SQL migrations...');
    
    // Get all SQL files from the migrations directory
    const migrationsDir = path.join(process.cwd(), 'drizzle', 'migrations');
    const sqlFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Sort to ensure consistent order
      .map(file => path.join(migrationsDir, file));
    
    console.log(`Found ${sqlFiles.length} migration files`);
    
    // Execute each SQL file
    for (const sqlFile of sqlFiles) {
      console.log(`Executing migration: ${path.basename(sqlFile)}`);
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      
      // Split by statement breakpoint and execute each statement
      const statements = sqlContent.split('--> statement-breakpoint');
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]?.trim() || '';
        if (statement) {
          try {
            console.log(`Executing statement ${i + 1}/${statements.length} (${statement.length} chars)`);
            console.log(`Statement preview: ${statement.substring(0, 50)}...`);
            
            await sql.unsafe(statement);
            console.log(`Statement ${i + 1}/${statements.length} executed successfully`);
          } catch (error: any) {
            // Error codes to skip:
            // 42P07 - relation already exists
            // 42P16 - constraint already exists
            // 42710 - object already exists (like indexes)
            // 23505 - duplicate key value violates unique constraint
            if (['42P07', '42P16', '42710', '23505'].includes(error.code)) {
              console.log(`Object already exists, skipping statement ${i + 1}`);
            } else {
              console.error(`Error executing statement ${i + 1}:`, error);
              console.error(`Statement was: ${statement}`);
              throw error;
            }
          }
        }
      }
      
      console.log(`Migration ${path.basename(sqlFile)} completed`);
    }
    
    // Record migrations in the drizzle migrations table
    try {
      // Check if the drizzle schema exists
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle`);
      
      // Check if the __drizzle_migrations table exists
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint NOT NULL
        )
      `);
      
      // Get all SQL files
      for (const sqlFile of sqlFiles) {
        const fileName = path.basename(sqlFile);
        const hash = calculateFileHash(fileName); // A simple hash function for demo purposes
        
        // Check if migration is already recorded
        const exists = await sql`
          SELECT COUNT(*) FROM drizzle.__drizzle_migrations 
          WHERE hash = ${hash}
        `;
        
        // Check if count exists and handle it safely
        let count = '1'; // Default to already migrated
        if (exists.length > 0 && exists[0] && typeof exists[0].count !== 'undefined') {
          count = String(exists[0].count);
        }
        
        if (count === '0') {
          // Record the migration
          await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
          `;
          console.log(`Recorded migration: ${fileName}`);
        } else {
          console.log(`Migration ${fileName} already recorded`);
        }
      }
    } catch (error) {
      console.warn("Error recording migrations:", error);
    }
  } finally {
    await sql.end();
  }
}

/**
 * Execute migrations by directly running SQL files for Neon serverless PostgreSQL
 */
async function executeNeonMigrationsSql(dbUrl: string) {
  // Type the client properly
  const client: NeonQueryFunction<any, any> = neon(dbUrl);
  
  console.log('Manually executing SQL migrations on Neon...');
  
  // Get all SQL files from the migrations directory
  const migrationsDir = path.join(process.cwd(), 'drizzle', 'migrations');
  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort() // Sort to ensure consistent order
    .map(file => path.join(migrationsDir, file));
  
  console.log(`Found ${sqlFiles.length} migration files`);
  
  // Execute each SQL file
  for (const sqlFile of sqlFiles) {
    console.log(`Executing migration: ${path.basename(sqlFile)}`);
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by statement breakpoint and execute each statement
    const statements = sqlContent.split('--> statement-breakpoint');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]?.trim() || '';
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length} (${statement.length} chars)`);
          console.log(`Statement preview: ${statement.substring(0, 50)}...`);
          
          // Use client directly instead of client.query
          await client(statement);
          console.log(`Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error: any) {
          // Error codes to skip:
          // 42P07 - relation already exists
          // 42P16 - constraint already exists
          // 42710 - object already exists (like indexes)
          // 23505 - duplicate key value violates unique constraint
          if (['42P07', '42P16', '42710', '23505'].includes(error.code)) {
            console.log(`Object already exists, skipping statement ${i + 1}`);
          } else {
            console.error(`Error executing statement ${i + 1}:`, error);
            console.error(`Statement was: ${statement}`);
            throw error;
          }
        }
      }
    }
    
    console.log(`Migration ${path.basename(sqlFile)} completed`);
  }
  
  // Record migrations in the drizzle migrations table
  try {
    // Check if the drizzle schema exists
    await client(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    
    // Check if the __drizzle_migrations table exists
    await client(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint NOT NULL
      )
    `);
    
    // Get all SQL files
    for (const sqlFile of sqlFiles) {
      const fileName = path.basename(sqlFile);
      const hash = calculateFileHash(fileName); // A simple hash function for demo purposes
      
      // Check if migration is already recorded
      const result = await client(`
        SELECT COUNT(*) FROM drizzle.__drizzle_migrations 
        WHERE hash = '${hash}'
      `);
      
      // Safely handle the result, which might have different structures
      let count = '1'; // Default to already migrated
      
      if (Array.isArray(result) && result.length > 0) {
        // Handle array response
        const firstRow = result[0];
        if (firstRow && typeof firstRow === 'object' && 'count' in firstRow) {
          count = String(firstRow.count);
        }
      } else if (typeof result === 'object' && result !== null) {
        // Handle object response with rows property
        const resultObj = result as { rows?: any[] };
        if (resultObj.rows && Array.isArray(resultObj.rows) && resultObj.rows.length > 0) {
          const firstRow = resultObj.rows[0];
          if (firstRow && typeof firstRow === 'object' && 'count' in firstRow) {
            count = String(firstRow.count || '1');
          }
        }
      }
      
      if (count === '0') {
        // Record the migration
        await client(`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES ('${hash}', ${Date.now()})
        `);
        console.log(`Recorded migration: ${fileName}`);
      } else {
        console.log(`Migration ${fileName} already recorded`);
      }
    }
  } catch (error) {
    console.warn("Error recording migrations:", error);
  }
}

/**
 * Calculate a simple hash for a filename
 */
function calculateFileHash(fileName: string): string {
  // Simple hash function for demo purposes
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    const char = fileName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16) + fileName.replace(/\W/g, '');
}

// Export the main function as default for use by other scripts
export default main;

// Execute the main function if this script is run directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Failed to run migrations:", err);
    process.exit(1);
  });
}
