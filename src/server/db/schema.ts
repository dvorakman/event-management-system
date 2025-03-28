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

// Users table (although we're using Clerk for auth, we still need to store some user data)
export const users = createTable(
  "user",
  {
    id: text("id").primaryKey(), // Using Clerk's user ID
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["user", "organizer", "admin"] })
      .default("user")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  }),
);

// Events table
export const events = createTable(
  "event",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    location: text("location").notNull(),
    type: text("type", {
      enum: ["conference", "concert", "workshop", "networking", "other"],
    }).notNull(),
    generalTicketPrice: decimal("general_ticket_price", { precision: 10, scale: 2 }).notNull(),
    vipTicketPrice: decimal("vip_ticket_price", { precision: 10, scale: 2 }).notNull(),
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
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
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: integer("event_id")
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
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
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    registrationId: integer("registration_id")
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
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type", {
      enum: ["registration", "reminder", "cancellation", "update"],
    }).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    eventId: integer("event_id").references(() => events.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userIdx: index("notification_user_idx").on(table.userId),
    eventNotificationIdx: index("event_notification_idx").on(table.eventId),
  }),
);

// Posts table (keep this for compatibility with existing code)
export const posts = createTable(
  "post",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: varchar("name", { length: 256 }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.name),
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

// Schema for inserting a post (keep this for compatibility)
export const insertPostSchema = createInsertSchema(posts);
export const selectPostSchema = createSelectSchema(posts);

// Export the query builder
export const queries = {
  users,
  events,
  registrations,
  tickets,
  notifications,
  posts,
} as const;
