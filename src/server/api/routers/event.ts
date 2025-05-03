import { z } from "zod";
import {
  and,
  eq,
  gt,
  gte,
  lte,
  like,
  or,
  count,
  sum,
  desc,
  sql,
  asc,
  inArray,
} from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  events,
  registrations,
  tickets,
  notifications,
  users,
} from "~/server/db/schema";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import QRCode from "qrcode";
import { TRPCError } from "@trpc/server";
import { mockDashboardService } from "~/lib/mock-services";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-03-31.basil",
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
            .enum(["conference", "concert", "workshop", "networking", "other"])
            .optional(),
          status: z
            .enum(["published", "draft", "cancelled", "completed"])
            .optional(),
          search: z.string().optional(), // Search by name, description, or location
          minPrice: z.number().optional(), // Minimum price filter
          maxPrice: z.number().optional(), // Maximum price filter
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

      // Apply search filter (case-insensitive search across multiple fields)
      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(events.name, searchTerm),
            like(events.description, searchTerm),
            like(events.location, searchTerm),
          ),
        );
      }

      // Apply price range filters
      if (input?.minPrice !== undefined) {
        conditions.push(gte(events.generalTicketPrice, input.minPrice));
      }

      if (input?.maxPrice !== undefined) {
        conditions.push(lte(events.generalTicketPrice, input.maxPrice));
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
        .where(and(gt(events.startDate, now), eq(events.status, "published")))
        .orderBy(events.startDate)
        .limit(input?.limit ?? 5);

      return result;
    }),

  verifyPayment: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        eventId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(
          "Starting payment verification for session:",
          input.sessionId,
          "and event:",
          input.eventId,
        );

        // Get the authenticated user's ID
        const userId = ctx.userId as string;
        console.log("Authenticated user ID:", userId);

        // Verify the payment session
        const session = await stripe.checkout.sessions
          .retrieve(input.sessionId, {
            expand: ["customer"],
          })
          .catch((error) => {
            console.error("Stripe session retrieval error:", error);
            throw new Error(
              `Failed to retrieve Stripe session: ${error.message}`,
            );
          });

        console.log("Retrieved Stripe session:", {
          id: session.id,
          paymentStatus: session.payment_status,
          customerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id,
          metadata: session.metadata,
          amountTotal: session.amount_total,
        });

        if (session.payment_status !== "paid") {
          throw new Error(`Invalid payment status: ${session.payment_status}`);
        }

        // Get event details
        const event = await ctx.db.query.events.findFirst({
          where: eq(events.id, input.eventId),
        });

        console.log("Retrieved event details:", {
          eventId: event?.id,
          eventName: event?.name,
          found: !!event,
        });

        if (!event) {
          throw new Error(`Event not found with ID: ${input.eventId}`);
        }

        // Generate unique ticket number
        const ticketNumber = nanoid(10).toUpperCase();
        console.log("Generated ticket number:", ticketNumber);

        // Generate QR code
        const qrCodeData = await QRCode.toDataURL(
          JSON.stringify({
            ticketNumber,
            eventId: input.eventId,
            sessionId: input.sessionId,
          }),
        ).catch((error) => {
          console.error("QR code generation error:", error);
          throw new Error("Failed to generate QR code");
        });

        console.log("Successfully generated QR code");

        // Create registration
        console.log("Creating registration with data:", {
          userId,
          eventId: input.eventId,
          ticketType: session.metadata?.ticketType,
          amount: session.amount_total ? session.amount_total / 100 : 0,
        });

        const [registration] = await ctx.db
          .insert(registrations)
          .values({
            userId,
            eventId: input.eventId,
            ticketType: session.metadata?.ticketType as "general" | "vip",
            status: "confirmed",
            paymentStatus: "completed",
            totalAmount: session.amount_total ? session.amount_total / 100 : 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()
          .catch((error) => {
            console.error("Registration creation error:", error);
            throw new Error(`Failed to create registration: ${error.message}`);
          });

        console.log("Created registration:", registration);

        // Create ticket
        console.log("Creating ticket for registration:", registration.id);
        const [ticket] = await ctx.db
          .insert(tickets)
          .values({
            registrationId: registration.id,
            ticketNumber,
            qrCode: qrCodeData,
            isUsed: false,
            createdAt: new Date(),
          })
          .returning()
          .catch((error) => {
            console.error("Ticket creation error:", error);
            throw new Error(`Failed to create ticket: ${error.message}`);
          });

        console.log("Successfully created ticket:", {
          ticketId: ticket.ticketNumber,
          registrationId: ticket.registrationId,
        });

        return {
          ticketId: ticket.ticketNumber,
          eventName: event.name,
          ticketType: registration.ticketType,
          purchaseDate: registration.createdAt,
        };
      } catch (error) {
        console.error("Detailed verification error:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          input: {
            sessionId: input.sessionId,
            eventId: input.eventId,
          },
        });

        // Re-throw the error with the original message if it exists
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to verify payment and create ticket");
      }
    }),

  createPaymentSession: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        ticketType: z.enum(["general", "vip"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get event details
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Calculate price based on ticket type
      const price =
        input.ticketType === "general"
          ? event.generalTicketPrice
          : event.vipTicketPrice;

      // Create a temporary customer
      const customer = await stripe.customers.create({
        description: `Temporary customer for event ${event.id}`,
      });

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id, // Associate the customer with the session
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${input.ticketType === "vip" ? "VIP" : "General"} Ticket - ${event.name}`,
                description:
                  input.ticketType === "vip"
                    ? `VIP Ticket includes: ${event.vipPerks}`
                    : "General Admission",
              },
              unit_amount: Number(price) * 100, // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}`,
        metadata: {
          eventId: event.id.toString(),
          ticketType: input.ticketType,
        },
      });

      return { sessionId: session.id };
    }),

  // Get stats for organizer dashboard
  getOrganizerStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is an organizer or admin
    if (ctx.dbUser.role !== "organizer" && ctx.dbUser.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an organizer to access this resource",
      });
    }

    // In development, use mock data
    const isDevelopment =
      !process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production";
      
    if (isDevelopment) {
      console.log("Using mock data for organizer stats");
      // Import mock data service from separate file
      return mockDashboardService.getDashboardStats();
    }

    // TODO: Implement real data fetching from database
    // This would be implemented when the backend is ready
    try {
      // Get the authenticated user's ID
      const userId = ctx.userId;
      console.log("Authenticated user ID:", userId);

      // Fetch events created by this organizer
      // Replace with actual database queries
      const stats = {
        // This would be real data from your database
      };

      return mockDashboardService.getDashboardStats(); // Temporary fallback
    } catch (error) {
      console.error("Error fetching organizer stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch organizer stats",
      });
    }
  }),

  // Get events for organizer dashboard
  getOrganizerEvents: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is an organizer or admin
    if (ctx.dbUser.role !== "organizer" && ctx.dbUser.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an organizer to access this resource",
      });
    }

    // In development, use mock data
    const isDevelopment =
      !process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production";
      
    if (isDevelopment) {
      console.log("Using mock data for organizer events");
      return mockDashboardService.getEvents();
    }

    // TODO: Implement real data fetching from database
    try {
      const userId = ctx.userId;
      console.log("Fetching events for organizer:", userId);

      // Fetch events created by this organizer
      // Replace with actual database queries
      
      return mockDashboardService.getEvents(); // Temporary fallback
    } catch (error) {
      console.error("Error fetching organizer events:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch organizer events",
      });
    }
  }),

  // Get attendees for organizer dashboard
  getOrganizerAttendees: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is an organizer or admin
    if (ctx.dbUser.role !== "organizer" && ctx.dbUser.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an organizer to access this resource",
      });
    }

    // In development, use mock data
    const isDevelopment =
      !process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production";
      
    if (isDevelopment) {
      console.log("Using mock data for organizer attendees");
      return mockDashboardService.getAttendees();
    }

    // TODO: Implement real data fetching from database
    try {
      const userId = ctx.userId;
      console.log("Fetching attendees for organizer:", userId);

      // Fetch attendees for events created by this organizer
      // Replace with actual database queries
      
      return mockDashboardService.getAttendees(); // Temporary fallback
    } catch (error) {
      console.error("Error fetching organizer attendees:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch organizer attendees",
      });
    }
  }),

  // Create a new event
  createEvent: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(100),
        description: z.string().min(10),
        startDate: z.date(),
        endDate: z.date(),
        location: z.string().min(3).max(100),
        type: z.enum([
          "conference",
          "concert",
          "workshop",
          "networking",
          "other",
        ]),
        generalTicketPrice: z.number().min(0),
        vipTicketPrice: z.number().min(0),
        vipPerks: z.string(),
        maxAttendees: z.number().min(1),
        status: z.enum(["draft", "published"]).default("draft"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId as string;

      // Ensure user is an organizer
      if (
        (ctx.dbUser as any)?.role !== "organizer" &&
        (ctx.dbUser as any)?.role !== "admin"
      ) {
        throw new Error("Only organizers can create events");
      }

      // Validate dates
      if (input.endDate < input.startDate) {
        throw new Error("End date cannot be before start date");
      }

      // Insert the event
      const [event] = await ctx.db
        .insert(events)
        .values({
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          location: input.location,
          type: input.type,
          generalTicketPrice: input.generalTicketPrice,
          vipTicketPrice: input.vipTicketPrice,
          vipPerks: input.vipPerks,
          maxAttendees: input.maxAttendees,
          organizerId: userId,
          status: input.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return event;
    }),

  // Update an event
  updateEvent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(3).max(100).optional(),
        description: z.string().min(10).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        location: z.string().min(3).max(100).optional(),
        type: z
          .enum(["conference", "concert", "workshop", "networking", "other"])
          .optional(),
        generalTicketPrice: z.number().min(0).optional(),
        vipTicketPrice: z.number().min(0).optional(),
        vipPerks: z.string().optional(),
        maxAttendees: z.number().min(1).optional(),
        status: z
          .enum(["draft", "published", "cancelled", "completed"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get the event
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.id),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Ensure user is the organizer of this event
      if (event.organizerId !== userId && ctx.dbUser.role !== "admin") {
        throw new Error("You do not have permission to update this event");
      }

      // Validate dates if both are provided
      if (input.startDate && input.endDate && input.endDate < input.startDate) {
        throw new Error("End date cannot be before start date");
      }

      // If status is changing to cancelled, handle cancellation
      if (input.status === "cancelled" && event.status !== "cancelled") {
        await handleEventCancellation(ctx, event.id);
      }

      // Update the event
      const [updatedEvent] = await ctx.db
        .update(events)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description && { description: input.description }),
          ...(input.startDate && { startDate: input.startDate }),
          ...(input.endDate && { endDate: input.endDate }),
          ...(input.location && { location: input.location }),
          ...(input.type && { type: input.type }),
          ...(input.generalTicketPrice !== undefined && {
            generalTicketPrice: input.generalTicketPrice,
          }),
          ...(input.vipTicketPrice !== undefined && {
            vipTicketPrice: input.vipTicketPrice,
          }),
          ...(input.vipPerks && { vipPerks: input.vipPerks }),
          ...(input.maxAttendees && { maxAttendees: input.maxAttendees }),
          ...(input.status && { status: input.status }),
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id))
        .returning();

      return updatedEvent;
    }),

  // Delete an event
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get the event
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.id),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Ensure user is the organizer of this event
      if (event.organizerId !== userId && ctx.dbUser.role !== "admin") {
        throw new Error("You do not have permission to delete this event");
      }

      // Cancel the event before deletion
      await handleEventCancellation(ctx, event.id);

      // Delete the event
      await ctx.db.delete(events).where(eq(events.id, input.id));

      return { success: true };
    }),

  // Get details for a specific event (for editing)
  getEventDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get event details
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.id),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Check permissions
      if (event.organizerId !== userId && ctx.dbUser.role !== "admin") {
        throw new Error(
          "You do not have permission to view this event's details",
        );
      }

      // Get registration statistics
      const stats = await ctx.db
        .select({
          totalRegistrations: count(),
          confirmedRegistrations: count(
            and(
              eq(registrations.status, "confirmed"),
              eq(registrations.eventId, input.id),
            ),
          ),
          totalRevenue: sum(registrations.totalAmount),
        })
        .from(registrations)
        .where(eq(registrations.eventId, input.id));

      return {
        ...event,
        stats: {
          totalRegistrations: stats[0]?.totalRegistrations ?? 0,
          confirmedRegistrations: stats[0]?.confirmedRegistrations ?? 0,
          totalRevenue: stats[0]?.totalRevenue ?? 0,
        },
      };
    }),

  // Get registrations for a specific event
  getEventRegistrations: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        status: z
          .enum(["all", "pending", "confirmed", "cancelled", "refunded"])
          .default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get the event
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Ensure user is the organizer of this event
      if (event.organizerId !== userId && ctx.dbUser.role !== "admin") {
        throw new Error(
          "You do not have permission to view registrations for this event",
        );
      }

      // Build query conditions
      const conditions = [eq(registrations.eventId, input.eventId)];

      if (input.status !== "all") {
        conditions.push(eq(registrations.status, input.status));
      }

      // Get registrations
      const eventRegistrations = await ctx.db
        .select({
          id: registrations.id,
          userId: registrations.userId,
          userName: users.name,
          userEmail: users.email,
          ticketType: registrations.ticketType,
          status: registrations.status,
          paymentStatus: registrations.paymentStatus,
          totalAmount: registrations.totalAmount,
          createdAt: registrations.createdAt,
          hasTicket: sql`EXISTS (SELECT 1 FROM ${tickets} WHERE ${tickets.registrationId} = ${registrations.id})`,
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(registrations.createdAt));

      return eventRegistrations;
    }),

  // Update registration status
  updateRegistrationStatus: protectedProcedure
    .input(
      z.object({
        registrationId: z.number(),
        status: z.enum(["confirmed", "cancelled", "refunded"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get the registration
      const registration = await ctx.db.query.registrations.findFirst({
        where: eq(registrations.id, input.registrationId),
        with: {
          event: true,
        },
      });

      if (!registration) {
        throw new Error("Registration not found");
      }

      // Ensure user is the organizer of this event
      if (
        registration.event.organizerId !== userId &&
        ctx.dbUser.role !== "admin"
      ) {
        throw new Error(
          "You do not have permission to update this registration",
        );
      }

      // Update the registration
      const [updatedRegistration] = await ctx.db
        .update(registrations)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(registrations.id, input.registrationId))
        .returning();

      // Create notification for the user
      await ctx.db.insert(notifications).values({
        userId: registration.userId,
        title: `Registration ${input.status} for ${registration.event.name}`,
        message: `Your registration for ${registration.event.name} has been ${input.status}.`,
        type: "registration",
        isRead: false,
        eventId: registration.eventId,
        createdAt: new Date(),
      });

      return updatedRegistration;
    }),

  // Get registration details
  getRegistrationDetails: protectedProcedure
    .input(z.object({ registrationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get the registration with ticket
      const registration = await ctx.db.query.registrations.findFirst({
        where: eq(registrations.id, input.registrationId),
        with: {
          event: true,
          ticket: true,
        },
      });

      if (!registration) {
        throw new Error("Registration not found");
      }

      // Ensure user is the organizer of this event
      if (
        registration.event.organizerId !== userId &&
        ctx.dbUser.role !== "admin"
      ) {
        throw new Error("You do not have permission to view this registration");
      }

      // Get user details
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, registration.userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: registration.id,
        userId: registration.userId,
        userName: user.name,
        userEmail: user.email,
        eventId: registration.event.id,
        eventName: registration.event.name,
        eventDate: registration.event.startDate,
        eventLocation: registration.event.location,
        ticketType: registration.ticketType,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        totalAmount: registration.totalAmount,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        ticket: registration.ticket
          ? {
              id: registration.ticket.id,
              ticketNumber: registration.ticket.ticketNumber,
              qrCode: registration.ticket.qrCode,
              isUsed: registration.ticket.isUsed,
            }
          : null,
      };
    }),
});

// Helper function to handle event cancellation
async function handleEventCancellation(ctx: any, eventId: number) {
  // Get all confirmed registrations for this event
  const registrationsToCancel = await ctx.db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.status, "confirmed"),
      ),
    );

  // Update all registrations to cancelled
  if (registrationsToCancel.length > 0) {
    await ctx.db
      .update(registrations)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.status, "confirmed"),
        ),
      );

    // Get event details
    const event = await ctx.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    // Create notifications for all affected users
    const notificationsToInsert = registrationsToCancel.map((reg: any) => ({
      userId: reg.userId,
      title: `Event Cancelled: ${event?.name}`,
      message: `We're sorry, but the event "${event?.name}" has been cancelled. If you made a payment, a refund will be processed.`,
      type: "cancellation",
      isRead: false,
      eventId,
      createdAt: new Date(),
    }));

    await ctx.db.insert(notifications).values(notificationsToInsert);

    // In a real application, you would process refunds here
    console.log(
      `Simulated refund processing for ${registrationsToCancel.length} registrations`,
    );
  }
}
