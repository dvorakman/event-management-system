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
  type User,
} from "~/server/db/schema";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import QRCode from "qrcode";
import { sendEmail } from "~/server/email/sendgrid";
import { TRPCError } from "@trpc/server";
import type { inferAsyncReturnType } from "@trpc/server";
import { createTRPCContext } from "~/server/api/trpc";
import { clerkClient } from "@clerk/nextjs/server";

type Context = inferAsyncReturnType<typeof createTRPCContext>;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
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
  // Get featured events for home page
  getFeaturedEvents: publicProcedure.query(async ({ ctx }) => {
    // Get events that are:
    // 1. Published
    // 2. Have good registration rates or are recent
    // 3. Are upcoming (not past events)
    const currentDate = new Date();
    
    const featuredEvents = await ctx.db
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
        registrationCount: count(registrations.id),
      })
      .from(events)
      .leftJoin(
        registrations,
        and(
          eq(events.id, registrations.eventId),
          eq(registrations.status, "confirmed")
        )
      )
      .where(
        and(
          eq(events.status, "published"),
          gte(events.startDate, currentDate)
        )
      )
      .groupBy(events.id)
      .orderBy(
        desc(count(registrations.id)), // Most popular events first
        desc(events.createdAt) // Then newest events
      )
      .limit(6);

    // Add calculated fields and check user registration status
    const eventsWithCalculatedFields = await Promise.all(
      featuredEvents.map(async (event) => {
        const registrationCount = Number(event.registrationCount);
        const isSoldOut = registrationCount >= event.maxAttendees;
        const availableSpots = event.maxAttendees - registrationCount;

        // Check if current user is already registered (if authenticated)
        let userRegistration = null;
        if (ctx.userId) {
          const userRegResult = await ctx.db
            .select()
            .from(registrations)
            .where(
              and(
                eq(registrations.eventId, event.id),
                eq(registrations.userId, ctx.userId),
                // Include all statuses except refunded to prevent multiple registrations
                or(
                  eq(registrations.status, "pending"),
                  eq(registrations.status, "confirmed"),
                  eq(registrations.status, "cancelled")
                )
              )
            )
            .limit(1);
          
          userRegistration = userRegResult[0] || null;
        }

        return {
          ...event,
          registrationCount,
          isSoldOut,
          availableSpots,
          userRegistration,
        };
      })
    );

    return eventsWithCalculatedFields;
  }),

  // Get all events with filtering options
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(10),
          cursor: z.string().optional(),
          type: z
            .enum(["conference", "music_concert", "networking"])
            .optional(),
          status: z
            .enum(["published", "draft", "cancelled", "completed"])
            .optional(),
          search: z.string().optional(),
          location: z.string().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
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

      // Apply search filter (case-insensitive search across name and description)
      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(events.name, searchTerm),
            like(events.description, searchTerm),
          ),
        );
      }

      // Apply location filter
      if (input?.location) {
        const locationTerm = `%${input.location}%`;
        conditions.push(like(events.location, locationTerm));
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
      let nextCursor: string | undefined = undefined;
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
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      const event = result[0];
      if (!event) return null;

      // Get current registration count
      const currentRegistrations = await ctx.db
        .select({ count: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, input.id),
            eq(registrations.status, "confirmed")
          )
        );

      const currentCount = currentRegistrations[0]?.count ?? 0;
      const isSoldOut = currentCount >= event.maxAttendees;
      const availableSpots = event.maxAttendees - currentCount;

      // Check if current user is already registered (if authenticated)
      let userRegistration = null;
      if (ctx.userId) {
        const userRegResult = await ctx.db
          .select()
          .from(registrations)
          .where(
            and(
              eq(registrations.eventId, input.id),
              eq(registrations.userId, ctx.userId),
              // Include all statuses except refunded to prevent multiple registrations
              or(
                eq(registrations.status, "pending"),
                eq(registrations.status, "confirmed"),
                eq(registrations.status, "cancelled")
              )
            )
          )
          .limit(1);
        
        userRegistration = userRegResult[0] || null;
      }

      return {
        ...event,
        currentRegistrations: currentCount,
        isSoldOut,
        availableSpots,
        userRegistration,
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
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id.toString()))
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
        eventId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to verify payment",
        });
      }

      try {
        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);

        console.log("Retrieved Stripe session:", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
          total: session.amount_total,
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

        // Get customer details from Stripe (name and email will be available after checkout)
        let customerDetails = null;
        if (session.customer && typeof session.customer === "object") {
          customerDetails = session.customer;
        } else if (typeof session.customer === "string") {
          customerDetails = await stripe.customers.retrieve(session.customer);
        }

        console.log("Customer details from Stripe:", customerDetails);

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
            // Event-specific data from metadata
            dietaryRequirements: session.metadata?.dietaryRequirements || null,
            specialNeeds: session.metadata?.specialNeeds || null,
            emergencyContact: session.metadata?.emergencyContact || null,
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

        // Get customer email and name from Stripe or fallback to user data
        const customerEmail = (customerDetails && "email" in customerDetails && customerDetails.email) || user?.email;
        const customerName = (customerDetails && "name" in customerDetails && customerDetails.name) || user?.name || "User";

        // Ensure event, email, registration, and ticket are defined before proceeding to email
        if (event && customerEmail && registration && ticket && ticket.qrCode) {
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
            <h1>Thank you for your purchase, ${customerName}!</h1>
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
            Thank you for your purchase, ${customerName}!
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
              to: customerEmail,
              subject: emailSubject,
              html: emailHtml,
              text: emailText,
              attachments: [qrAttachment],
            });
            console.log(
              `Confirmation email sent to ${customerEmail} for event ${event.id}`,
            );
          } catch (emailError) {
            console.error(
              `Failed to send confirmation email to ${customerEmail}: `,
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
          attendeeName: customerName,
          attendeeEmail: customerEmail || "Unknown",
          eventName: event.name,
          eventDate: event.startDate.toISOString(),
          eventLocation: event.location,
          ticketType: registration.ticketType,
          ticketPrice: Number(registration.totalAmount),
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

      const registration = await ctx.db
        .select()
        .from(registrations)
        .where(
          and(
            eq(registrations.userId, userId),
            eq(registrations.eventId, input.eventId),
          ),
        )
        .limit(1);

      if (!registration[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // Update registration status
      await ctx.db
        .update(registrations)
        .set({
          status: "confirmed",
          paymentStatus: "completed",
        })
        .where(eq(registrations.id, registration[0].id));

      return { success: true };
    }),

  createPaymentSession: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        ticketType: z.enum(["general", "vip"]),
        eventSpecificData: z.object({
          dietaryRequirements: z.string().optional(),
          specialNeeds: z.string().optional(),
          emergencyContact: z.string().optional(),
        }).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to create a payment session",
        });
      }

      const event = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);

      if (!event[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event[0].status !== "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only register for published events.",
        });
      }

      // Check if user is already registered for this event
      const existingRegistration = await ctx.db
        .select()
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, input.eventId),
            eq(registrations.userId, ctx.userId),
            // Check for any active registration (not refunded)
            or(
              eq(registrations.status, "pending"),
              eq(registrations.status, "confirmed"),
              eq(registrations.status, "cancelled")
            )
          )
        )
        .limit(1);

      if (existingRegistration.length > 0) {
        const reg = existingRegistration[0]!;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You already have a ${reg.status} registration for this event. Please check your dashboard or contact support if you need assistance.`,
        });
      }

      // Check current registration count to prevent overselling
      const currentRegistrations = await ctx.db
        .select({ count: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, input.eventId),
            eq(registrations.status, "confirmed")
          )
        );

      const currentCount = currentRegistrations[0]?.count ?? 0;

      if (currentCount >= event[0].maxAttendees) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event is sold out",
        });
      }

      // Calculate price based on ticket type
      const price =
        input.ticketType === "vip"
          ? event[0].vipTicketPrice
          : event[0].generalTicketPrice;

      // Create registration
      const [registration] = await ctx.db
        .insert(registrations)
        .values({
          userId,
          eventId: input.eventId,
          ticketType: input.ticketType,
          totalAmount: price,
          ...(input.eventSpecificData && {
            ...(input.eventSpecificData.dietaryRequirements && {
              dietaryRequirements: input.eventSpecificData.dietaryRequirements,
            }),
            ...(input.eventSpecificData.specialNeeds && {
              specialNeeds: input.eventSpecificData.specialNeeds,
            }),
            ...(input.eventSpecificData.emergencyContact && {
              emergencyContact: input.eventSpecificData.emergencyContact,
            }),
          }),
        })
        .returning();

      if (!registration) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create registration",
        });
      }

      // Get user email from database
      const dbUser = ctx.dbUser;
      if (!dbUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User information not found",
        });
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${event[0].name} - ${input.ticketType === "vip" ? "VIP" : "General"} Ticket`,
                description: event[0].description || undefined,
                metadata: {
                  eventId: input.eventId,
                  ticketType: input.ticketType,
                  registrationId: registration.id.toString(),
                },
              },
              unit_amount: Math.round(Number(price) * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        customer_email: dbUser.email,
        metadata: {
          eventId: input.eventId,
          ticketType: input.ticketType,
          registrationId: registration.id,
          userId: userId,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${input.eventId}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${input.eventId}`,
      });

      return {
        sessionId: session.id,
        registrationId: registration.id,
        amount: price,
      };
    }),

  // Get organizer statistics
  getOrganizerStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view organizer stats",
      });
    }

    // 1. Get all events for this organizer
    const allEvents = await ctx.db
      .select({ id: events.id, status: events.status })
      .from(events)
      .where(eq(events.organizerId, userId));
    const allEventIds = allEvents.map(e => e.id);
    const publishedEventIds = allEvents.filter(e => e.status === "published").map(e => e.id);

    // 2. totalEvents: count all events (any status)
    const totalEvents = allEvents.length;

    // 3. publishedEvents: count only published events
    const publishedEvents = publishedEventIds.length;

    // 4. totalRegistrations: count all registrations (any status) for all events (any status)
    const totalRegistrationsResult = await ctx.db
      .select({ count: count() })
      .from(registrations)
      .where(inArray(registrations.eventId, allEventIds));
    const totalRegistrations = totalRegistrationsResult[0]?.count ?? 0;

    // 5. Get all registrations for published events (any status)
    const publishedRegistrations = await ctx.db
      .select({
        status: registrations.status,
        amount: registrations.totalAmount,
        createdAt: registrations.createdAt,
        ticketType: registrations.ticketType,
      })
      .from(registrations)
      .where(inArray(registrations.eventId, publishedEventIds));

    // 6. totalRevenue: sum confirmed - refunded/cancelled for published events
    let totalRevenue = 0;
    for (const reg of publishedRegistrations) {
      if (reg.status === "confirmed") {
        totalRevenue += Number(reg.amount ?? 0);
      } else if (reg.status === "refunded" || reg.status === "cancelled") {
        totalRevenue -= Number(reg.amount ?? 0);
      }
    }

    // 7. monthlyRevenue: for published events, per month, sum (confirmed - refunded/cancelled)
    const now = new Date();
    const months: { month: string; year: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleString("default", { month: "short" }), year: d.getFullYear() });
    }
    const monthlyRevenue = months.map(({ month, year }) => {
      let sum = 0;
      for (const reg of publishedRegistrations) {
        const d = new Date(reg.createdAt);
        if (d.getFullYear() === year && d.toLocaleString("default", { month: "short" }) === month) {
          if (reg.status === "confirmed") {
            sum += Number(reg.amount ?? 0);
          } else if (reg.status === "refunded" || reg.status === "cancelled") {
            sum -= Number(reg.amount ?? 0);
          }
        }
      }
      return { month: `${month} ${year}`, revenue: sum };
    });

    // 8. ticketDistribution: for published events, count confirmed tickets by type
    const ticketDistribution = {
      general: publishedRegistrations.filter(r => r.status === "confirmed" && r.ticketType === "general").length,
      vip: publishedRegistrations.filter(r => r.status === "confirmed" && r.ticketType === "vip").length,
    };

    // 9. recentRegistrations: for published events, confirmed only
    const recentRegistrations = await ctx.db
      .select({
        id: registrations.id,
        eventName: events.name,
        ticketType: registrations.ticketType,
        amount: registrations.totalAmount,
        date: registrations.createdAt,
      })
      .from(registrations)
      .leftJoin(events, eq(registrations.eventId, events.id))
      .where(
        and(
          eq(registrations.status, "confirmed"),
          eq(events.organizerId, userId),
          eq(events.status, "published"),
        ),
      )
      .orderBy(desc(registrations.createdAt))
      .limit(5);

    return {
      totalEvents,
      publishedEvents,
      totalRegistrations,
      totalRevenue,
      recentRegistrations,
      monthlyRevenue,
      ticketDistribution,
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
          "music_concert",
          "networking",
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
        ctx.userRole !== "organizer" &&
        ctx.userRole !== "admin"
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
          generalTicketPrice: input.generalTicketPrice.toString(),
          vipTicketPrice: input.vipTicketPrice.toString(),
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
        id: z.string(),
        name: z.string().min(3).max(100).optional(),
        description: z.string().min(10).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        location: z.string().min(3).max(100).optional(),
        type: z
          .enum(["conference", "music_concert", "networking"])
          .optional(),
        generalTicketPrice: z.union([z.string(), z.number()]).optional(),
        vipTicketPrice: z.union([z.string(), z.number()]).optional(),
        vipPerks: z.string().optional(),
        maxAttendees: z.number().min(1).optional(),
        status: z
          .enum(["draft", "published", "cancelled", "completed"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update an event",
        });
      }

      const event = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event[0].organizerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own events",
        });
      }

      const { id, generalTicketPrice, vipTicketPrice, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (generalTicketPrice !== undefined) {
        updateData.generalTicketPrice = generalTicketPrice.toString();
      }
      if (vipTicketPrice !== undefined) {
        updateData.vipTicketPrice = vipTicketPrice.toString();
      }

      await ctx.db
        .update(events)
        .set(updateData)
        .where(eq(events.id, id));

      return { success: true };
    }),

  // Delete an event
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete an event",
        });
      }

      const event = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event[0].organizerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own events",
        });
      }

      await ctx.db.delete(events).where(eq(events.id, input.id));

      return { success: true };
    }),

  // Get details for a specific event (for editing)
  getEventDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view event details",
        });
      }

      const event = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event[0].organizerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view details of your own events",
        });
      }

      // Get registration statistics for this event
      const allRegistrations = await ctx.db
        .select({
          status: registrations.status,
          amount: registrations.totalAmount,
        })
        .from(registrations)
        .where(eq(registrations.eventId, input.id));

      // Calculate stats
      const totalRegistrations = allRegistrations.length;
      const confirmedRegistrations = allRegistrations.filter(
        (reg) => reg.status === "confirmed"
      ).length;
      
      let totalRevenue = 0;
      for (const reg of allRegistrations) {
        if (reg.status === "confirmed") {
          totalRevenue += Number(reg.amount ?? 0);
        } else if (reg.status === "refunded" || reg.status === "cancelled") {
          totalRevenue -= Number(reg.amount ?? 0);
        }
      }

      return {
        ...event[0],
        stats: {
          totalRegistrations,
          confirmedRegistrations,
          totalRevenue,
        },
      };
    }),

  // Get registrations for a specific event
  getEventRegistrations: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z
          .enum(["all", "pending", "confirmed", "cancelled", "refunded"])
          .default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view registrations",
        });
      }

      const event = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);

      if (!event[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event[0].organizerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view registrations for your own events",
        });
      }

      const whereClause = and(
        eq(registrations.eventId, input.eventId),
        input.status !== "all"
          ? eq(registrations.status, input.status)
          : undefined,
      );

      const result = await ctx.db
        .select({
          registration: registrations,
          user: users,
        })
        .from(registrations)
        .leftJoin(users, eq(registrations.userId, users.id))
        .where(whereClause)
        .orderBy(registrations.createdAt);

      return result;
    }),

  // Update registration status
  updateRegistrationStatus: protectedProcedure
    .input(
      z.object({
        registrationId: z.string(),
        status: z.enum(["confirmed", "cancelled", "refunded"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Use a select with join to get registration and event
      const registrationResult = await ctx.db
        .select({
          id: registrations.id,
          userId: registrations.userId,
          eventId: registrations.eventId,
          ticketType: registrations.ticketType,
          status: registrations.status,
          paymentStatus: registrations.paymentStatus,
          totalAmount: registrations.totalAmount,
          createdAt: registrations.createdAt,
          updatedAt: registrations.updatedAt,
          eventOrganizerId: events.organizerId,
          eventName: events.name,
        })
        .from(registrations)
        .leftJoin(events, eq(registrations.eventId, events.id))
        .where(eq(registrations.id, input.registrationId))
        .limit(1);
      const registration = registrationResult[0];

      if (!registration) {
        throw new Error("Registration not found");
      }

      // Ensure user is the organizer of this event
      if (
        registration.eventOrganizerId !== userId &&
        ctx.userRole !== "admin"
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
        title: `Registration ${input.status} for ${registration.eventName}`,
        message: `Your registration for ${registration.eventName} has been ${input.status}.`,
        type: "registration",
        isRead: false,
        eventId: registration.eventId,
        createdAt: new Date(),
      });

      return updatedRegistration;
    }),

  // Get registration details
  getRegistrationDetails: protectedProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get the registration with ticket and event
      const registrationResult = await ctx.db
        .select({
          id: registrations.id,
          userId: registrations.userId,
          eventId: registrations.eventId,
          ticketType: registrations.ticketType,
          status: registrations.status,
          paymentStatus: registrations.paymentStatus,
          totalAmount: registrations.totalAmount,
          createdAt: registrations.createdAt,
          updatedAt: registrations.updatedAt,
          eventOrganizerId: events.organizerId,
          eventName: events.name,
          eventStartDate: events.startDate,
          eventLocation: events.location,
          ticketId: tickets.id,
          ticketNumber: tickets.ticketNumber,
          ticketQrCode: tickets.qrCode,
          ticketIsUsed: tickets.isUsed,
        })
        .from(registrations)
        .leftJoin(events, eq(registrations.eventId, events.id))
        .leftJoin(tickets, eq(tickets.registrationId, registrations.id))
        .where(eq(registrations.id, input.registrationId))
        .limit(1);
      const registration = registrationResult[0];

      if (!registration) {
        throw new Error("Registration not found");
      }

      // Ensure user is the organizer of this event
      if (
        registration.eventOrganizerId !== userId &&
        ctx.userRole !== "admin"
      ) {
        throw new Error("You do not have permission to view this registration");
      }

      // Get user details
      const userResult = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, registration.userId))
        .limit(1);
      const user = userResult[0];

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: registration.id,
        userId: registration.userId,
        userName: user.name,
        userEmail: user.email,
        eventId: registration.eventId,
        eventName: registration.eventName,
        eventDate: registration.eventStartDate,
        eventLocation: registration.eventLocation,
        ticketType: registration.ticketType,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        totalAmount: registration.totalAmount,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        ticket: registration.ticketId
          ? {
              id: registration.ticketId,
              ticketNumber: registration.ticketNumber,
              qrCode: registration.ticketQrCode,
              isUsed: registration.ticketIsUsed,
            }
          : null,
      };
    }),
});

// Helper function to handle event cancellation
async function handleEventCancellation(ctx: Context, eventId: string) {
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
    const eventResult = await ctx.db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const event = eventResult[0];

    // Create notifications for all affected users
    const notificationsToInsert = registrationsToCancel.map((reg) => ({
      userId: reg.userId,
      title: `Event Cancelled: ${event?.name}`,
      message: `We're sorry, but the event "${event?.name}" has been cancelled. If you made a payment, a refund will be processed.`,
      type: "cancellation" as const,
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
