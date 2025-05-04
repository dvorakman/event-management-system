CREATE TYPE "public"."user_role" AS ENUM('user', 'organizer', 'admin');--> statement-breakpoint
ALTER TABLE "event-management-system_user" ALTER COLUMN "role" SET DATA TYPE user_role;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "became_organizer_at" timestamp;