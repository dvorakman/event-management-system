// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTableCreator,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
  (name) => `event-management-system_${name}`,
);

export const userRole = pgEnum("user_role", ["user", "organizer", "admin"]);

// Users table - stores Clerk ID and minimal profile data for relationship tracking
// Auth and role management primarily handled by Clerk
export const users = createTable(
  "user",
  {
    id: text("id").primaryKey(), // Clerk's user ID as the primary key
    email: text("email").notNull(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    role: userRole("role").default("user").notNull(), // Local mirror of role for easier querying
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  }),
);

// Events table
export const events = createTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    location: text("location").notNull(),
    type: text("type", {
      enum: ["conference", "music_concert", "networking"],
    }).notNull(),
    generalTicketPrice: decimal("general_ticket_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    vipTicketPrice: decimal("vip_ticket_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    vipPerks: text("vip_perks").notNull(),
    maxAttendees: integer("max_attendees").notNull(),
    organizerId: text("organizer_id")
      .notNull()
      .references(() => users.id),
    status: text("status", {
      enum: ["draft", "published", "cancelled", "completed"],
    })
      .default("draft")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    organizerIdx: index("organizer_idx").on(table.organizerId),
    typeIdx: index("type_idx").on(table.type),
    startDateIdx: index("start_date_idx").on(table.startDate),
    statusIdx: index("status_idx").on(table.status),
  }),
);

// Registrations table
export const registrations = createTable(
  "registration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    ticketType: text("ticket_type", { enum: ["general", "vip"] }).notNull(),
    status: text("status", {
      enum: ["pending", "confirmed", "cancelled", "refunded"],
    })
      .default("pending")
      .notNull(),
    paymentStatus: text("payment_status", {
      enum: ["pending", "completed", "failed", "refunded"],
    })
      .default("pending")
      .notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    // Event-specific information (name and email will come from Stripe)
    dietaryRequirements: text("dietary_requirements"),
    specialNeeds: text("special_needs"),
    emergencyContact: text("emergency_contact"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    userEventIdx: index("user_event_idx").on(table.userId, table.eventId),
    eventIdx: index("event_idx").on(table.eventId),
    statusIdx: index("registration_status_idx").on(table.status),
  }),
);

// Tickets table
export const tickets = createTable(
  "ticket",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id),
    ticketNumber: text("ticket_number").notNull(),
    qrCode: text("qr_code").notNull(), // URL or encoded string for QR code
    isUsed: boolean("is_used").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    registrationIdx: index("registration_idx").on(table.registrationId),
    ticketNumberIdx: index("ticket_number_idx").on(table.ticketNumber),
  }),
);

// Notifications table
export const notifications = createTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type", {
      enum: ["registration", "reminder", "cancellation", "update"],
    }).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    eventId: uuid("event_id").references(() => events.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userIdx: index("notification_user_idx").on(table.userId),
    eventNotificationIdx: index("event_notification_idx").on(table.eventId),
  }),
);

// Schema for inserting a user
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Schema for inserting an event
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);

// Schema for inserting a registration
export const insertRegistrationSchema = createInsertSchema(registrations);
export const selectRegistrationSchema = createSelectSchema(registrations);

// Schema for inserting a ticket
export const insertTicketSchema = createInsertSchema(tickets);
export const selectTicketSchema = createSelectSchema(tickets);

// Schema for inserting a notification
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

// Export the query builder
export const queries = {
  users,
  events,
  registrations,
  tickets,
  notifications,
} as const;

// Schema type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "user" | "organizer" | "admin";
