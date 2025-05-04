ALTER TABLE "event-management-system_user" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "profile_image" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "last_sign_in_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "username_idx" ON "event-management-system_user" USING btree ("username");--> statement-breakpoint
ALTER TABLE "event-management-system_user" DROP COLUMN "name";