import type { Config } from "drizzle-kit";
import { env } from "./src/env";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.NEON_DATABASE_URL ?? env.DATABASE_URL ?? "",
  },
} satisfies Config;
