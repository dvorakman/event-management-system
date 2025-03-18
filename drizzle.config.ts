import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Use NEON_DATABASE_URL if available, otherwise fall back to DATABASE_URL
    url: process.env.NEON_DATABASE_URL || env.DATABASE_URL,
  },
  tablesFilter: ["event-management-system_*"],
} satisfies Config;
