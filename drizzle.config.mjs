import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Try to load environment variables from various possible files
const envFiles = ['.env.local', '.env', '.env.development'];
for (const file of envFiles) {
  if (fs.existsSync(path.resolve(process.cwd(), file))) {
    console.log(`Loading environment from ${file}`);
    config({ path: file });
  }
}

// Ensure DATABASE_URL or NEON_DATABASE_URL is set
const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "Critical: No DATABASE_URL or NEON_DATABASE_URL found in environment variables. " +
    "Please set one of these variables in your .env file or environment configuration."
  );
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  verbose: true,
  strict: true,
}); 