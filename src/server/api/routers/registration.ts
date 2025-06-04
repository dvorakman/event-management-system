import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { registrations, tickets, notifications } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "~/server/stripe";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

export const registrationRouter = createTRPCRouter({
  createRegistration: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        ticketType: z.enum(["general", "vip"]),
        // Add other fields needed from the client for registration
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId; // This will still error until context is fixed

      // Check if user is already registered for this event (optional but recommended)
      // const existingRegistration = await db.query.registrations.findFirst({ ... });
      // if (existingRegistration) { throw new TRPCError({ code: 'CONFLICT', message: 'Already registered.' }); }

      const newRegistration = await db
        .insert(registrations)
        .values({
          userId: userId, // Get userId from context
          eventId: input.eventId,
          ticketType: input.ticketType as "general" | "vip",
          status: "pending", // Start as pending
          // Add other fields from input as needed
          registeredAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: registrations.id });

      if (
        !newRegistration ||
        newRegistration.length === 0 ||
        !newRegistration[0]
      ) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create registration record.",
        });
      }

      return { registrationId: newRegistration[0].id };
    }),

  verifyPaymentSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId } = input;
      const userId = ctx.auth.userId;

      if (!sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session ID is required.",
        });
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (
          session.payment_status === "paid" &&
          session.status === "complete"
        ) {
          const registrationId = session.metadata?.registrationId;

          if (!registrationId) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Registration ID not found in Stripe session metadata.",
            });
          }

          // Find the registration
          const registration = await db.query.registrations.findFirst({
            where: and(
              eq(registrations.id, parseInt(registrationId, 10)),
              eq(registrations.userId, userId),
            ),
            with: {
              event: {
                columns: {
                  name: true,
                  startDate: true,
                  location: true,
                },
              },
              user: {
                columns: {
                  email: true,
                  firstName: true, // Get first name for personalization
                },
              },
            },
          });

          if (!registration) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Registration not found or does not belong to user.",
            });
          }

          // If already confirmed, just return success (idempotency)
          if (registration.status === "confirmed") {
            console.log(`Registration ${registrationId} already confirmed.`);
            // Optional: Maybe resend email if needed?
            // For now, just return success without resending.
            return {
              success: true,
              message: "Registration already confirmed.",
            };
          }

          // Update registration status to confirmed
          await db
            .update(registrations)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(eq(registrations.id, registration.id));

          // Optionally create a ticket record (if your schema uses one)
          // await db.insert(tickets).values({ registrationId: registration.id, /* other ticket details */ });

          // --- Create In-App Notification ---
          try {
            const notificationMessage = `Successfully registered for "${registration.event.name}"!`;
            // The schema doesn't seem to support a direct link field based on linter errors.
            // const notificationLink = `/dashboard?tab=tickets`;

            await db.insert(notifications).values({
              userId: userId, // Assuming 'userId' is the correct column name
              title: "Registration Successful", // Added missing title
              message: notificationMessage,
              type: "registration", // Added type based on linter error hint
              isRead: false, // Changed from 'read' to 'isRead' based on linter error hint
            });
            console.log(
              `In-app notification created for user ${userId} regarding registration ${registration.id}`,
            );
          } catch (notificationError) {
            // Log error but don't fail the entire process if notification creation fails
            console.error(
              `Failed to create in-app notification for user ${userId}, registration ${registration.id}:`,
              notificationError,
            );
          }
          // --- End In-App Notification ---

          return {
            success: true,
            message: "Registration confirmed successfully.",
          };
        } else {
          // Handle cases where payment wasn't successful
          console.warn(
            `Payment verification failed for session ${sessionId}: Payment status ${session.payment_status}, Session status ${session.status}`,
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment not successful (Status: ${session.payment_status}, ${session.status}).`,
          });
        }
      } catch (error) {
        console.error("Error verifying Stripe session:", error);
        if (error instanceof TRPCError) throw error; // Re-throw known TRPC errors

        // Handle Stripe-specific errors or general errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify payment session.",
          cause: error instanceof Error ? error.message : String(error),
        });
      }
    }),
});
