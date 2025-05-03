import { z } from "zod";
import { and, eq, gt, gte, lte, like, sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { events } from "~/server/db/schema";

// Placeholder Event Type - Define what an event looks like
const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  date: z.date(),
  location: z.string().optional(),
  organizer: z.string().optional(),
  category: z.enum(["conference", "music_concert", "networking"]).optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
});

export type Event = z.infer<typeof eventSchema>;

// Schema for search/filter inputs
const searchEventsInputSchema = z.object({
  query: z.string().optional(), // Keyword search
  category: z.enum(["conference", "music_concert", "networking"]).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  location: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  sortBy: z.enum(["date", "price"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(9),
});

// Schema for the output of the searchEvents procedure
const searchEventsOutputSchema = z.object({
  events: z.array(eventSchema),
  totalEvents: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
});

export const eventRouter = createTRPCRouter({
  // Get all events with filtering options
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(10),
          cursor: z.number().optional(), // For pagination
          type: z
            .enum(["conference", "music_concert", "networking"])
            .optional(),
          status: z
            .enum(["published", "draft", "cancelled", "completed"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Build all the conditions
      const conditions = [];
      
      // Apply filters if provided
      if (input?.type) {
        conditions.push(eq(events.type, input.type));
      }

      // For public listings, only show published events
      if (input?.status) {
        conditions.push(eq(events.status, input.status));
      } else {
        conditions.push(eq(events.status, "published"));
      }

      // Apply cursor-based pagination
      if (input?.cursor) {
        conditions.push(gt(events.id, input.cursor));
      }

      // Execute query with all conditions
      const items = await ctx.db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(events.startDate)
        .limit(input?.limit ?? 10);

      // Get the next cursor
      let nextCursor: number | undefined = undefined;
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          nextCursor = lastItem.id;
        }
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get event details by ID
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  // Get upcoming events (limit to next 5 events)
  upcoming: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const result = await ctx.db
        .select()
        .from(events)
        .where(and(
          gt(events.startDate, now),
          eq(events.status, "published")
        ))
        .orderBy(events.startDate)
        .limit(input?.limit ?? 5);

      return result;
    }),

  searchEvents: publicProcedure
    .input(searchEventsInputSchema.optional())
    .query(async ({ ctx, input }) => {
      // Provide defaults if input is undefined
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const sortBy = input?.sortBy ?? 'date';
      const sortOrder = input?.sortOrder ?? 'asc';
      
      // Build query conditions
      const conditions = [eq(events.status, "published")];
      
      if (input?.query) {
        conditions.push(
          sql`(${events.name} ILIKE ${`%${input.query}%`} OR ${
            events.description
          } ILIKE ${`%${input.query}%`})`
        );
      }

      if (input?.category) {
        conditions.push(sql`LOWER(${events.type}) = LOWER(${input.category})`);
      }

      if (input?.location) {
        conditions.push(like(events.location, `%${input.location}%`));
      }

      if (input?.dateFrom) {
        conditions.push(gte(events.startDate, input.dateFrom));
      }

      if (input?.dateTo) {
        conditions.push(lte(events.startDate, input.dateTo));
      }

      if (input?.priceMin !== undefined) {
        conditions.push(sql`CAST(${events.generalTicketPrice} AS DECIMAL) >= ${input.priceMin}`);
      }

      if (input?.priceMax !== undefined) {
        conditions.push(sql`CAST(${events.generalTicketPrice} AS DECIMAL) <= ${input.priceMax}`);
      }

      // Count total events for pagination
      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(events)
        .where(and(...conditions));

      const count = countResult[0]?.count ?? 0;

      // Get paginated events
      const offset = (page - 1) * limit;
      const eventResults = await ctx.db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          startDate: events.startDate,
          endDate: events.endDate,
          location: events.location,
          type: events.type,
          generalTicketPrice: events.generalTicketPrice,
          vipTicketPrice: events.vipTicketPrice,
          maxAttendees: events.maxAttendees,
          status: events.status,
        })
        .from(events)
        .where(and(...conditions))
        .orderBy(
          sortBy === "date" 
            ? sortOrder === "asc" 
              ? events.startDate 
              : sql`${events.startDate} desc`
            : sortOrder === "asc" 
              ? sql`CAST(${events.generalTicketPrice} AS DECIMAL)`
              : sql`CAST(${events.generalTicketPrice} AS DECIMAL) desc`
        )
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(count / limit);

      return {
        events: eventResults.map(event => ({
          ...event,
          date: event.startDate, // For compatibility with frontend
          category: event.type, // For compatibility with frontend
        })),
        totalEvents: count,
        totalPages,
        currentPage: page,
      };
    }),

  getEventById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      return {
        ...result[0],
        date: result[0].startDate, // For compatibility with frontend
        category: result[0].type, // For compatibility with frontend
      };
    }),
});
