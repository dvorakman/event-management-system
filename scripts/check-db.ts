import postgres from 'postgres';
import { env } from "../src/env.js";

async function checkDb() {
  console.log('Starting database check...');
  
  // Get database URL from environment variables
  const databaseUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)",
    );
  }

  console.log('Connecting to database...');
  // Create postgres client
  const sql = postgres(databaseUrl, { max: 1 });
  
  try {
    console.log('Checking database tables...');
    
    // Query to get event management system tables specifically
    console.log('\nEvent Management System tables:');
    const eventTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'event-management-system_%'
      ORDER BY table_name;
    `;
    
    if (eventTables.length === 0) {
      console.log('No event management system tables found');
    } else {
      console.log(`Found ${eventTables.length} event tables:`);
      for (const table of eventTables) {
        console.log(`- ${table.table_name}`);
      }
    }
    
    // Also check for drizzle schema tables
    try {
      console.log('\nDrizzle schema tables:');
      const migrationTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'drizzle'
        ORDER BY table_name;
      `;
      
      if (migrationTables.length === 0) {
        console.log('No tables found in drizzle schema');
      } else {
        console.log(`Found ${migrationTables.length} drizzle tables:`);
        for (const table of migrationTables) {
          console.log(`- ${table.table_name}`);
        }
      }
    } catch (e) {
      console.log('\nNo drizzle schema found');
    }
    
    console.log('\nDatabase check completed successfully.');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    console.log('Closing database connection...');
    await sql.end();
    console.log('Connection closed');
  }
}

// Run the check and handle any errors
checkDb().catch(error => {
  console.error('Script failed with error:', error);
  
  // Allow time for error output to be displayed
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}); 