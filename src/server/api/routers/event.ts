import { z } from "zod";
import { desc, eq, and, gte, lte, like, or } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { events } from "~/server/db/schema";

export const eventRouter = createTRPCRouter({
  // Get all events with filtering options
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        offset: z.number().min(0).optional().default(0),
        type: z.string().optional(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        searchTerm: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build conditions array for filtering
      const conditions = [];

      // Filter by type
      if (input.type) {
        conditions.push(eq(events.type, input.type));
      }

      // Filter by location
      if (input.location) {
        conditions.push(like(events.location, `%${input.location}%`));
      }

      // Filter by date range
      if (input.startDate) {
        conditions.push(gte(events.startDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(events.startDate, new Date(input.endDate)));
      }

      // Filter by price range (using general ticket price)
      if (input.minPrice !== undefined) {
        conditions.push(gte(events.generalTicketPrice, input.minPrice));
      }
      if (input.maxPrice !== undefined) {
        conditions.push(lte(events.generalTicketPrice, input.maxPrice));
      }

      // Search by term in name or description
      if (input.searchTerm) {
        conditions.push(
          or(
            like(events.name, `%${input.searchTerm}%`),
            like(events.description, `%${input.searchTerm}%`),
          ),
        );
      }

      // Add status filter to only show published events
      conditions.push(eq(events.status, "published"));

      // Execute query with all conditions
      const filteredEvents = await ctx.db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.startDate))
        .limit(input.limit)
        .offset(input.offset);

      // Transform the response to match the expected format
      return filteredEvents.map(event => ({
        ...event,
        ticketPrice: event.generalTicketPrice, // Use general ticket price as the display price
      }));
    }),

  // Get event details by ID
  byId: publicProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, Number(input.id)))
        .limit(1);

      if (!event[0]) return null;

      // Transform the response to match the expected format
      return {
        ...event[0],
        ticketPrice: event[0].generalTicketPrice,
      };
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
          gte(events.startDate, now),
          eq(events.status, "published")
        ))
        .orderBy(events.startDate)
        .limit(input?.limit ?? 5);

      return result;
    }),
});
