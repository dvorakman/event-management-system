import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { events } from "~/server/db/schema";

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
});
