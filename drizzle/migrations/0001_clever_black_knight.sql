CREATE TABLE `event-management-system_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`location` text NOT NULL,
	`type` text NOT NULL,
	`general_ticket_price` real NOT NULL,
	`vip_ticket_price` real NOT NULL,
	`vip_perks` text NOT NULL,
	`max_attendees` integer NOT NULL,
	`organizer_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`organizer_id`) REFERENCES `event-management-system_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `organizer_idx` ON `event-management-system_event` (`organizer_id`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `event-management-system_event` (`type`);--> statement-breakpoint
CREATE INDEX `start_date_idx` ON `event-management-system_event` (`start_date`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `event-management-system_event` (`status`);--> statement-breakpoint
CREATE TABLE `event-management-system_notification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`event_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `event-management-system_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `event-management-system_event`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `event-management-system_notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `event_notification_idx` ON `event-management-system_notification` (`event_id`);--> statement-breakpoint
CREATE TABLE `event-management-system_registration` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`event_id` integer NOT NULL,
	`ticket_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`total_amount` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `event-management-system_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `event-management-system_event`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_event_idx` ON `event-management-system_registration` (`user_id`,`event_id`);--> statement-breakpoint
CREATE INDEX `event_idx` ON `event-management-system_registration` (`event_id`);--> statement-breakpoint
CREATE INDEX `registration_status_idx` ON `event-management-system_registration` (`status`);--> statement-breakpoint
CREATE TABLE `event-management-system_ticket` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`ticket_number` text NOT NULL,
	`qr_code` text NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `event-management-system_registration`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `registration_idx` ON `event-management-system_ticket` (`registration_id`);--> statement-breakpoint
CREATE INDEX `ticket_number_idx` ON `event-management-system_ticket` (`ticket_number`);--> statement-breakpoint
CREATE TABLE `event-management-system_user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `email_idx` ON `event-management-system_user` (`email`);