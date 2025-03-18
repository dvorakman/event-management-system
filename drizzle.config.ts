import { type Config } from "drizzle-kit";

import { env } from "~/env";

// Ensure we have a database URL
const dbUrl = env.NEON_DATABASE_URL ?? env.DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)"
  );
}

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  driver: "pg",
  dbCredentials: {
    url: dbUrl,
  },
  tablesFilter: ["event-management-system_*"],
  // Specify whether to strict check migration files
  strict: true,
} satisfies Config;
