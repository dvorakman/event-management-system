import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users, registrations, events, tickets } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
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

  // New procedure to get user's tickets/registrations
  getMyTickets: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    const userRegistrations = await ctx.db
      .select({
        registrationId: registrations.id,
        eventId: events.id,
        eventName: events.name,
        eventStartDate: events.startDate,
        eventLocation: events.location,
        ticketType: registrations.ticketType,
        purchaseDate: registrations.createdAt,
        ticketNumber: tickets.ticketNumber,
        qrCodeUrl: tickets.qrCode,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .leftJoin(tickets, eq(registrations.id, tickets.registrationId)) // Use leftJoin in case ticket generation failed
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.status, "confirmed"), // Only show confirmed registrations
        ),
      )
      .orderBy(desc(registrations.createdAt));

    return userRegistrations;
  }),
});
