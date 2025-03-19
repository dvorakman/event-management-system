import * as dotenv from "dotenv";
dotenv.config();

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "No database URL provided. Set DATABASE_URL in your .env file.",
  );
}

/** @type {import("drizzle-kit").Config} */
export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
  tablesFilter: ["event-management-system_*"],
  strict: true,
};
