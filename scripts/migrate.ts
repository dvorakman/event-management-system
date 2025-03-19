import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import BetterSQLite3 from "better-sqlite3";
import { createClient } from "@libsql/client";
import { drizzle as drizzleTurso } from "drizzle-orm/libsql";
import { migrate as migrateTurso } from "drizzle-orm/libsql/migrator";

// This script runs migrations on the database

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error(
      "No database URL provided. Set DATABASE_URL in your .env file.",
    );
  }

  console.log("🔄 Running migrations...");

  try {
    // Check if we're using a remote Turso database
    if (dbUrl.includes("turso.io")) {
      const client = createClient({
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });
      const db = drizzleTurso(client);

      await migrateTurso(db, {
        migrationsFolder: "drizzle/migrations",
      });
    } else {
      // Local SQLite database
      const dbPath = dbUrl.replace("file:", "");
      const sqlite = new BetterSQLite3(dbPath);
      const db = drizzle(sqlite);

      await migrate(db, {
        migrationsFolder: "drizzle/migrations",
      });

      // Close the database connection
      sqlite.close();
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
