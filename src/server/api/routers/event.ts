import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { events, insertEventSchema } from "~/server/db/schema";

export const eventRouter = createTRPCRouter({
  // Get all events with filtering options
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(10),
          cursor: z.number().optional(), // For pagination
          type: z
            .enum(["conference", "concert", "workshop", "networking", "other"])
            .optional(),
          status: z
            .enum(["published", "draft", "cancelled", "completed"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Start building the query
      let query = ctx.db.select().from(events);

      // Apply filters if provided
      if (input?.type) {
        query = query.where(events.type, "=", input.type);
      }

      // For public listings, only show published events
      if (input?.status) {
        query = query.where(events.status, "=", input.status);
      } else {
        query = query.where(events.status, "=", "published");
      }

      // Apply cursor-based pagination
      if (input?.cursor) {
        query = query.where(events.id, ">", input.cursor);
      }

      // Apply limit and order by start date (soonest first)
      query = query.orderBy(events.startDate).limit(input?.limit || 10);

      const items = await query;

      // Get the next cursor
      let nextCursor: number | undefined = undefined;
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = lastItem.id;
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
        .where(events.id, "=", input.id)
        .limit(1);

      return result[0] || null;
    }),

  // Get upcoming events (limit to next 5 events)
  upcoming: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date().toISOString();

      const result = await ctx.db
        .select()
        .from(events)
        .where(events.startDate, ">", now)
        .where(events.status, "=", "published")
        .orderBy(events.startDate)
        .limit(input?.limit || 5);

      return result;
    }),
});
