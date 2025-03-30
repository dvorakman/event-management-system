import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  becomeOrganizer: protectedProcedure
    .input(z.object({
      // Basic verification details
      organizerName: z.string().min(2),
      phoneNumber: z.string().min(8),
      organizationName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role === "organizer") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already an organizer",
        });
      }

      // Update user to organizer role
      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          role: "organizer",
          becameOrganizerAt: new Date(),
          // You might want to store the organizer details in a separate table
          // or in the metadata field if you're using it
        })
        .where(eq(users.id, ctx.userId))
        .returning();

      return updatedUser;
    }),

  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.dbUser;
    }),
}); 