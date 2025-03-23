import * as dotenv from "dotenv";
dotenv.config();

// Get database URL from environment variables
const databaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)",
  );
}

/** @type {import("drizzle-kit").Config} */
export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  tablesFilter: ["event-management-system_*"],
  strict: true,
};
