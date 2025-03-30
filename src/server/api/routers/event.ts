import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { events, registrations, tickets } from "~/server/db/schema";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import QRCode from "qrcode";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
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

  verifyPaymentAndCreateTicket: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        eventId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Starting payment verification for session:", input.sessionId, "and event:", input.eventId);
        
        // Get the authenticated user's ID
        const userId = ctx.auth.userId;
        console.log("Authenticated user ID:", userId);

        // Verify the payment session
        const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ['customer'],
        }).catch(error => {
          console.error("Stripe session retrieval error:", error);
          throw new Error(`Failed to retrieve Stripe session: ${error.message}`);
        });

        console.log("Retrieved Stripe session:", {
          id: session.id,
          paymentStatus: session.payment_status,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          metadata: session.metadata,
          amountTotal: session.amount_total
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
          found: !!event
        });

        if (!event) {
          throw new Error(`Event not found with ID: ${input.eventId}`);
        }

        // Generate unique ticket number
        const ticketNumber = nanoid(10).toUpperCase();
        console.log("Generated ticket number:", ticketNumber);
        
        // Generate QR code
        const qrCodeData = await QRCode.toDataURL(JSON.stringify({
          ticketNumber,
          eventId: input.eventId,
          sessionId: input.sessionId
        })).catch(error => {
          console.error("QR code generation error:", error);
          throw new Error("Failed to generate QR code");
        });

        console.log("Successfully generated QR code");

        // Create registration
        console.log("Creating registration with data:", {
          userId,
          eventId: input.eventId,
          ticketType: session.metadata?.ticketType,
          amount: session.amount_total ? session.amount_total / 100 : 0
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
          .catch(error => {
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
          .catch(error => {
            console.error("Ticket creation error:", error);
            throw new Error(`Failed to create ticket: ${error.message}`);
          });

        console.log("Successfully created ticket:", {
          ticketId: ticket.ticketNumber,
          registrationId: ticket.registrationId
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
            eventId: input.eventId
          }
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
      })
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
      const price = input.ticketType === "general" 
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
                description: input.ticketType === "vip" 
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
});
