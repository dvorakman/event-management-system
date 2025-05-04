import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createClerkClient } from "@clerk/backend";

// Create a Clerk client instance
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const userRouter = createTRPCRouter({
  becomeOrganizer: protectedProcedure
    .input(
      z.object({
        // Basic verification details
        organizerName: z.string().min(2),
        phoneNumber: z.string().min(8),
        organizationName: z.string().optional(),
      }),
    )
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

      // Update Clerk's publicMetadata with the new role
      try {
        await clerk.users.updateUser(ctx.userId, {
          publicMetadata: {
            ...(await clerk.users.getUser(ctx.userId)).publicMetadata,
            role: "organizer",
          },
        });
        console.log(
          `Updated Clerk metadata with organizer role for user ${ctx.userId}`,
        );
      } catch (error) {
        console.error("Error updating Clerk metadata:", error);
        // Continue even if Clerk update fails, the middleware will catch up eventually
      }

      return updatedUser;
    }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.dbUser;
  }),
});
