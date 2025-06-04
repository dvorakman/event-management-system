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
import { sendEmail } from "~/server/email/sendgrid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-03-31.basil",
});

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
        conditions.push(
          gte(events.generalTicketPrice, input.minPrice.toString()),
        );
      }

      if (input?.maxPrice !== undefined) {
        conditions.push(
          lte(events.generalTicketPrice, input.maxPrice.toString()),
        );
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

  // Search events with advanced filtering (from SCRUM-276 branch)
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

  // Get event by ID with compatibility mapping (from SCRUM-276 branch)
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
        const userId = ctx.userId;
        console.log("Authenticated user ID:", userId);

        // Verify the payment session
        const session = await stripe.checkout.sessions
          .retrieve(input.sessionId, {
            expand: ["customer"],
          })
          .catch((error) => {
            console.error("Stripe session retrieval error:", error);
            if (error instanceof Error) {
              throw new Error(
                `Failed to retrieve Stripe session: ${error.message}`,
              );
            }
            throw new Error(
              "Failed to retrieve Stripe session due to an unknown error.",
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

        const registrationRows = await ctx.db
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
            if (error instanceof Error) {
              throw new Error(
                `Failed to create registration: ${error.message}`,
              );
            }
            throw new Error(
              "Failed to create registration due to an unknown error.",
            );
          });

        if (!registrationRows || registrationRows.length === 0) {
          throw new Error("Registration creation failed or no data returned.");
        }
        const registration = registrationRows[0];

        console.log("Created registration:", registration);

        // Create ticket
        console.log("Creating ticket for registration:", registration?.id);
        const ticketRows = await ctx.db
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
            if (error instanceof Error) {
              throw new Error(`Failed to create ticket: ${error.message}`);
            }
            throw new Error("Failed to create ticket due to an unknown error.");
          });

        if (!ticketRows || ticketRows.length === 0) {
          throw new Error("Ticket creation failed or no data returned.");
        }
        const ticket = ticketRows[0];

        console.log("Successfully created ticket:", {
          ticketId: ticket?.ticketNumber,
          registrationId: ticket?.registrationId,
        });

        // Fetch user's email
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            email: true,
            name: true, // Fetch name for personalization
          },
        });

        // Ensure event, user, registration, and ticket are defined before proceeding to email
        if (event && user?.email && registration && ticket && ticket.qrCode) {
          const emailSubject = `Your Ticket for ${event.name}!`;

          // Prepare QR code for CID embedding
          const qrCodeBase64 = ticket.qrCode.split(",")[1]; // Get base64 part after "data:image/png;base64,"
          const qrAttachment = {
            content: qrCodeBase64 ?? "", // Ensure content is not undefined
            filename: "qrcode.png",
            type: "image/png",
            disposition: "inline" as const, // Use "as const" for literal type
            content_id: "ticketQRCode", // This ID will be used in the img src
          };

          const emailHtml = `
            <h1>Thank you for your purchase, ${user.name ?? "User"}!</h1>
            <p>You have successfully registered for the event: <strong>${event.name}</strong>.</p>
            <p><strong>Ticket Details:</strong></p>
            <ul>
              <li>Ticket Number: ${ticket.ticketNumber}</li>
              <li>Ticket Type: ${registration.ticketType}</li>
              <li>Purchase Date: ${registration.createdAt.toLocaleDateString()}</li>
              <li>Event Date: ${event.startDate.toLocaleDateString()}</li>
            </ul>
            <p>Your QR code for entry:</p>
            <div style="margin: 10px 0;">
              <img src="cid:ticketQRCode" alt="Your Ticket QR Code" style="width: 200px; height: 200px; display: block;" />
            </div>
            <p>We look forward to seeing you there!</p>
          `;
          const emailText = `
            Thank you for your purchase, ${user.name ?? "User"}!
            You have successfully registered for the event: ${event.name}.
            Ticket Details:
            - Ticket Number: ${ticket.ticketNumber}
            - Ticket Type: ${registration.ticketType}
            - Purchase Date: ${registration.createdAt.toLocaleDateString()}
            - Event Date: ${event.startDate.toLocaleDateString()}
            Your QR code is attached to this email.
            We look forward to seeing you there!
          `;

          try {
            await sendEmail({
              to: user.email,
              subject: emailSubject,
              html: emailHtml,
              text: emailText,
              attachments: [qrAttachment],
            });
            console.log(
              `Confirmation email sent to ${user.email} for event ${event.id}`,
            );
          } catch (emailError) {
            console.error(
              `Failed to send confirmation email to ${user.email}: `,
              emailError,
            );
            // Decide if you want to throw an error or just log it
            // For now, we'll just log it and not interrupt the ticket return
          }
        } else {
          console.warn(
            `User email not found for userId: ${userId}. Cannot send confirmation email. Or other critical data missing.`,
          );
        }

        // Final check before returning, ensuring essential objects are defined
        if (!event || !registration || !ticket) {
          console.error(
            "Critical data missing for return (event, registration, or ticket undefined).",
          );
          throw new Error(
            "Failed to process payment fully, critical data missing.",
          );
        }

        // Return ticket details including the QR code data URL
        return {
          ticketId: ticket.ticketNumber,
          eventName: event.name,
          ticketType: registration.ticketType,
          purchaseDate: registration.createdAt,
          qrCodeUrl: ticket.qrCode,
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

  // Get organizer statistics
  getOrganizerStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get total events
    const eventsResult = await ctx.db
      .select({ count: count() })
      .from(events)
      .where(eq(events.organizerId, userId));

    const totalEvents = eventsResult[0]?.count ?? 0;

    // Get total registrations and revenue
    const registrationsResult = await ctx.db
      .select({
        count: count(),
        revenue: sum(registrations.totalAmount),
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(
        and(
          eq(events.organizerId, userId),
          eq(registrations.status, "confirmed"),
        ),
      );

    const totalRegistrations = registrationsResult[0]?.count ?? 0;
    const totalRevenue = registrationsResult[0]?.revenue ?? 0;

    // Get recent registrations
    const recentRegistrations = await ctx.db
      .select({
        id: registrations.id,
        eventName: events.name,
        ticketType: registrations.ticketType,
        amount: registrations.totalAmount,
        date: registrations.createdAt,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(eq(events.organizerId, userId))
      .orderBy(desc(registrations.createdAt))
      .limit(5);

    return {
      totalEvents,
      totalRegistrations,
      totalRevenue,
      recentRegistrations,
    };
  }),

  // Get events for an organizer
  getOrganizerEvents: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get organizer events with registration counts
    const organizedEvents = await ctx.db
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
        createdAt: events.createdAt,
        registrations: count(registrations.id),
      })
      .from(events)
      .leftJoin(
        registrations,
        and(
          eq(events.id, registrations.eventId),
          eq(registrations.status, "confirmed"),
        ),
      )
      .where(eq(events.organizerId, userId))
      .groupBy(events.id)
      .orderBy(desc(events.createdAt));

    return organizedEvents;
  }),

  // Get attendees for an organizer's events
  getOrganizerAttendees: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get attendees for organizer's events
    const attendees = await ctx.db
      .select({
        id: registrations.id,
        userId: registrations.userId,
        userName: users.name,
        eventId: events.id,
        eventName: events.name,
        ticketType: registrations.ticketType,
        status: registrations.status,
        paymentStatus: registrations.paymentStatus,
        totalAmount: registrations.totalAmount,
        createdAt: registrations.createdAt,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(users, eq(registrations.userId, users.id))
      .where(eq(events.organizerId, userId))
      .orderBy(desc(registrations.createdAt));

    return attendees;
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
      const userId = ctx.userId;

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
