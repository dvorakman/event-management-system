ALTER TABLE "event-management-system_user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "profile_picture_url" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "biography" text;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "communication_preferences" text DEFAULT '{"email":true,"push":true}';--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "privacy_settings" text DEFAULT '{"profile":"public","events":"private"}';--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "tos_accepted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "tos_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event-management-system_user" ADD COLUMN "last_login_at" timestamp with time zone;