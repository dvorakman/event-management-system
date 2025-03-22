import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "~/env";

// This script runs migrations on the database

async function main() {
  const dbUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error(
      "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)"
    );
  }

  console.log("🔄 Running migrations...");
  
  const sql = postgres(dbUrl, { max: 1 });
  const db = drizzle(sql);
  
  try {
    await migrate(db, {
      migrationsFolder: "drizzle/migrations",
    });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
  
  await sql.end();
  process.exit(0);
}

// Execute the main function
main().catch(err => {
  console.error("Failed to run migrations:", err);
  process.exit(1);
}); 