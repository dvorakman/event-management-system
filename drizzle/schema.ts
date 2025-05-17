import { pgTable, index, text, timestamp, foreignKey, integer, numeric, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userRole = pgEnum("user_role", ['user', 'organizer', 'admin'])


export const eventManagementSystemUser = pgTable("event-management-system_user", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	username: text(),
	profileImage: text("profile_image"),
	role: userRole().default('user').notNull(),
	externalId: text("external_id"),
	metadata: text(),
	lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	becameOrganizerAt: timestamp("became_organizer_at", { mode: 'string' }),
}, (table) => [
	index("email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);

export const eventManagementSystemEvent = pgTable("event-management-system_event", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""event-management-system_event_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	name: text().notNull(),
	description: text().notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }).notNull(),
	location: text().notNull(),
	type: text().notNull(),
	generalTicketPrice: numeric("general_ticket_price", { precision: 10, scale:  2 }).notNull(),
	vipTicketPrice: numeric("vip_ticket_price", { precision: 10, scale:  2 }).notNull(),
	vipPerks: text("vip_perks").notNull(),
	maxAttendees: integer("max_attendees").notNull(),
	organizerId: text("organizer_id").notNull(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("organizer_idx").using("btree", table.organizerId.asc().nullsLast().op("text_ops")),
	index("start_date_idx").using("btree", table.startDate.asc().nullsLast().op("timestamptz_ops")),
	index("status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizerId],
			foreignColumns: [eventManagementSystemUser.id],
			name: "event-management-system_event_organizer_id_event-management-sys"
		}),
]);

export const eventManagementSystemNotification = pgTable("event-management-system_notification", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""event-management-system_notification_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	eventId: integer("event_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("event_notification_idx").using("btree", table.eventId.asc().nullsLast().op("int4_ops")),
	index("notification_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [eventManagementSystemUser.id],
			name: "event-management-system_notification_user_id_event-management-s"
		}),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [eventManagementSystemEvent.id],
			name: "event-management-system_notification_event_id_event-management-"
		}),
]);

export const eventManagementSystemRegistration = pgTable("event-management-system_registration", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""event-management-system_registration_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: text("user_id").notNull(),
	eventId: integer("event_id").notNull(),
	ticketType: text("ticket_type").notNull(),
	status: text().default('pending').notNull(),
	paymentStatus: text("payment_status").default('pending').notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("event_idx").using("btree", table.eventId.asc().nullsLast().op("int4_ops")),
	index("registration_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("user_event_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.eventId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [eventManagementSystemUser.id],
			name: "event-management-system_registration_user_id_event-management-s"
		}),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [eventManagementSystemEvent.id],
			name: "event-management-system_registration_event_id_event-management-"
		}),
]);

export const eventManagementSystemTicket = pgTable("event-management-system_ticket", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""event-management-system_ticket_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	registrationId: integer("registration_id").notNull(),
	ticketNumber: text("ticket_number").notNull(),
	qrCode: text("qr_code").notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("registration_idx").using("btree", table.registrationId.asc().nullsLast().op("int4_ops")),
	index("ticket_number_idx").using("btree", table.ticketNumber.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.registrationId],
			foreignColumns: [eventManagementSystemRegistration.id],
			name: "event-management-system_ticket_registration_id_event-management"
		}),
]);
