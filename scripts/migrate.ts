import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { env } from "../src/env";

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
      const client = neon(dbUrl);
      const db = drizzleNeon(client);

      await migrateNeon(db, {
        migrationsFolder: "drizzle/migrations",
      });
    } else {
      // Using standard PostgreSQL
      console.log("Using standard PostgreSQL");
      const client = postgres(dbUrl);
      const db = drizzle(client);

      await migrate(db, {
        migrationsFolder: "drizzle/migrations",
      });

      // Close the database connection
      await client.end();
    }

    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to run migrations:", err);
  process.exit(1);
});
