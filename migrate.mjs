import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const main = async () => {
  console.log('Starting migration...');
  
  // Get database URL from environment variables
  const databaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "No database URL provided. Set either NEON_DATABASE_URL (for production) or DATABASE_URL (for local development)",
    );
  }

  // Create postgres client
  const connectionString = databaseUrl;
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  // Run migrations
  console.log('Running migrations...');
  
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS "event-management-system_user" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'user',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS "email_idx" ON "event-management-system_user" ("email")`;
    
    // Events table
    await sql`
      CREATE TABLE IF NOT EXISTS "event-management-system_event" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "start_date" TIMESTAMPTZ NOT NULL,
        "end_date" TIMESTAMPTZ NOT NULL,
        "location" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "general_ticket_price" DECIMAL(10, 2) NOT NULL,
        "vip_ticket_price" DECIMAL(10, 2) NOT NULL,
        "vip_perks" TEXT NOT NULL,
        "max_attendees" INTEGER NOT NULL,
        "organizer_id" TEXT NOT NULL REFERENCES "event-management-system_user"("id"),
        "status" TEXT NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS "organizer_idx" ON "event-management-system_event" ("organizer_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "type_idx" ON "event-management-system_event" ("type")`;
    await sql`CREATE INDEX IF NOT EXISTS "start_date_idx" ON "event-management-system_event" ("start_date")`;
    await sql`CREATE INDEX IF NOT EXISTS "status_idx" ON "event-management-system_event" ("status")`;
    
    // Registrations table
    await sql`
      CREATE TABLE IF NOT EXISTS "event-management-system_registration" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "event-management-system_user"("id"),
        "event_id" INTEGER NOT NULL REFERENCES "event-management-system_event"("id"),
        "ticket_type" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "payment_status" TEXT NOT NULL DEFAULT 'pending',
        "total_amount" DECIMAL(10, 2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS "user_event_idx" ON "event-management-system_registration" ("user_id", "event_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "event_idx" ON "event-management-system_registration" ("event_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "registration_status_idx" ON "event-management-system_registration" ("status")`;
    
    // Tickets table
    await sql`
      CREATE TABLE IF NOT EXISTS "event-management-system_ticket" (
        "id" SERIAL PRIMARY KEY,
        "registration_id" INTEGER NOT NULL REFERENCES "event-management-system_registration"("id"),
        "ticket_number" TEXT NOT NULL,
        "qr_code" TEXT NOT NULL,
        "is_used" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS "registration_idx" ON "event-management-system_ticket" ("registration_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "ticket_number_idx" ON "event-management-system_ticket" ("ticket_number")`;
    
    // Notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS "event-management-system_notification" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "event-management-system_user"("id"),
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "event_id" INTEGER REFERENCES "event-management-system_event"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS "notification_user_idx" ON "event-management-system_notification" ("user_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "event_notification_idx" ON "event-management-system_notification" ("event_id")`;
    
    // Posts table
    await sql`
      CREATE TABLE IF NOT EXISTS "event-management-system_post" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(256),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS "name_idx" ON "event-management-system_post" ("name")`;
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
};

main(); 