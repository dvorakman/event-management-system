import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { posts, insertPostSchema } from "~/server/db/schema";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(insertPostSchema)
    .mutation(async ({ ctx, input }) => {
      // Using the type-safe insert
      const result = await ctx.db.insert(posts).values(input);
      return result;
    }),

  getLatest: publicProcedure.query(async ({ ctx }) => {
    // Using the prepared query
    const result = await ctx.db
      .select()
      .from(posts)
      .orderBy(posts.createdAt)
      .limit(1);
    
    return result[0] ?? null;
  }),
});
