import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users, registrations, events, tickets } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createClerkClient } from "@clerk/backend";

// Create a Clerk client instance
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const userRouter = createTRPCRouter({
  // Endpoint removed: becomeOrganizer - role selection happens only at signup

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.dbUser;
  }),

  // New procedure to get user's tickets/registrations with personal information
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
        totalAmount: registrations.totalAmount,
        status: registrations.status,
        // Personal information fields
        dietaryRequirements: registrations.dietaryRequirements,
        specialNeeds: registrations.specialNeeds,
        emergencyContact: registrations.emergencyContact,
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
