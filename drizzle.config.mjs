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

// If DATABASE_URL is still not set, try to use a default value
const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
if (!dbUrl) {
  console.warn("Warning: No DATABASE_URL found in environment variables. Please check your .env files.");
  console.warn("Using default Docker Compose PostgreSQL connection if available...");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  verbose: true,
  strict: true,
}); 