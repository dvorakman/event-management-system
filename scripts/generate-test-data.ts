import { faker } from "@faker-js/faker";
import { db } from "../src/server/db";
import {
  events,
  users,
  registrations,
  tickets,
  notifications,
} from "../src/server/db/schema";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

// Configuration
const NUM_ORGANIZERS = 10;
const NUM_USERS = 30;
const NUM_EVENTS = 20;
const NUM_REGISTRATIONS = 50;

// Event types
const EVENT_TYPES = [
  "conference",
  "concert",
  "workshop",
  "networking",
  "other",
] as const;
// Event statuses
const EVENT_STATUSES = [
  "published",
  "draft",
  "cancelled",
  "completed",
] as const;
// Registration statuses
const REGISTRATION_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "refunded",
] as const;
// Ticket types
const TICKET_TYPES = ["general", "vip"] as const;

// Helper to get a random item from an array
const randomItem = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

// Helper to get a random date in the future
const randomFutureDate = (maxMonthsAhead = 6): Date => {
  const futureDate = new Date();
  futureDate.setMonth(
    futureDate.getMonth() + Math.floor(Math.random() * maxMonthsAhead),
  );
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 28));
  return futureDate;
};

// Helper to get a random date in the past
const randomPastDate = (maxMonthsAgo = 6): Date => {
  const pastDate = new Date();
  pastDate.setMonth(
    pastDate.getMonth() - Math.floor(Math.random() * maxMonthsAgo),
  );
  pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 28));
  return pastDate;
};

// Helper to get a random end date after a start date
const randomEndDate = (startDate: Date, maxDaysAfter = 5): Date => {
  const endDate = new Date(startDate);
  endDate.setDate(
    endDate.getDate() + Math.floor(Math.random() * maxDaysAfter) + 1,
  );
  return endDate;
};

async function generateTestData() {
  console.log("Starting test data generation...");

  try {
    // Step 1: Create test users with different roles
    console.log("Generating users...");
    const userIds: string[] = [];

    // Generate regular users
    for (let i = 0; i < NUM_USERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName });
      const username = faker.internet.userName({ firstName, lastName });

      const [newUser] = await db
        .insert(users)
        .values({
          id: `user_${nanoid(10)}`,
          email,
          firstName,
          lastName,
          username,
          profileImage: faker.image.avatar(),
          role: "user",
          createdAt: randomPastDate(),
          updatedAt: new Date(),
        })
        .returning();

      userIds.push(newUser.id);

      if (i % 5 === 0) {
        console.log(`Created ${i + 1} users...`);
      }
    }

    // Step 2: Create organizers
    console.log("Generating organizers...");
    const organizerIds: string[] = [];

    for (let i = 0; i < NUM_ORGANIZERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName });
      const username = faker.internet.userName({ firstName, lastName });

      const [newOrganizer] = await db
        .insert(users)
        .values({
          id: `org_${nanoid(10)}`,
          email,
          firstName,
          lastName,
          username,
          profileImage: faker.image.avatar(),
          role: "organizer",
          createdAt: randomPastDate(),
          updatedAt: new Date(),
        })
        .returning();

      organizerIds.push(newOrganizer.id);
    }

    console.log(`Created ${organizerIds.length} organizers`);

    // Step 3: Create events
    console.log("Generating events...");
    const eventIds: number[] = [];

    for (let i = 0; i < NUM_EVENTS; i++) {
      const startDate = randomFutureDate();
      const endDate = randomEndDate(startDate);
      const eventType = randomItem(EVENT_TYPES);
      const status = i < 12 ? "published" : randomItem(EVENT_STATUSES);

      // Generate price with realistic values
      const generalTicketPrice =
        Math.round(faker.number.int({ min: 10, max: 100 }) / 5) * 5; // Round to nearest $5
      const vipTicketPrice =
        generalTicketPrice +
        Math.round(faker.number.int({ min: 50, max: 200 }) / 10) * 10; // Higher VIP price, rounded to nearest $10

      const [newEvent] = await db
        .insert(events)
        .values({
          name: faker.company.catchPhrase(),
          description: faker.lorem.paragraphs(2),
          startDate,
          endDate,
          location: faker.location.city() + ", " + faker.location.state(),
          type: eventType,
          generalTicketPrice: generalTicketPrice.toString(), // Convert to string for DB
          vipTicketPrice: vipTicketPrice.toString(), // Convert to string for DB
          vipPerks: faker.lorem.sentences(2),
          maxAttendees: faker.number.int({ min: 50, max: 500 }),
          organizerId: randomItem(organizerIds),
          status,
          createdAt: randomPastDate(),
          updatedAt: new Date(),
        })
        .returning();

      eventIds.push(newEvent.id);

      if (i % 5 === 0) {
        console.log(`Created ${i + 1} events...`);
      }
    }

    // Step 4: Create registrations and tickets
    console.log("Generating registrations and tickets...");

    for (let i = 0; i < NUM_REGISTRATIONS; i++) {
      const userId = randomItem(userIds);
      const eventId = randomItem(eventIds);
      const ticketType = randomItem(TICKET_TYPES);
      const status = randomItem(REGISTRATION_STATUSES);

      // Get event to determine price
      const event = await db.query.events.findFirst({
        where: (events, { eq }) => eq(events.id, eventId),
      });

      if (!event) {
        console.log(
          `Event with ID ${eventId} not found, skipping registration`,
        );
        continue;
      }

      const amount =
        ticketType === "general"
          ? parseFloat(event.generalTicketPrice)
          : parseFloat(event.vipTicketPrice);

      // Create registration
      const [newRegistration] = await db
        .insert(registrations)
        .values({
          userId,
          eventId,
          ticketType,
          status,
          paymentStatus:
            status === "confirmed"
              ? "completed"
              : status === "pending"
                ? "pending"
                : "refunded",
          totalAmount: amount,
          createdAt: randomPastDate(3),
          updatedAt: new Date(),
        })
        .returning();

      // Create ticket for confirmed registrations
      if (status === "confirmed") {
        const ticketNumber = nanoid(10).toUpperCase();

        // Generate QR code
        const qrCodeData = await QRCode.toDataURL(
          JSON.stringify({
            ticketNumber,
            eventId,
            registrationId: newRegistration.id,
          }),
        );

        await db.insert(tickets).values({
          registrationId: newRegistration.id,
          ticketNumber,
          qrCode: qrCodeData,
          isUsed: Math.random() > 0.8, // 20% of tickets are used
          createdAt: newRegistration.createdAt,
        });

        // Create a notification for the user
        await db.insert(notifications).values({
          userId,
          title: `Registration confirmed for ${event.name}`,
          message: `Your registration for ${event.name} has been confirmed. Your ticket is now available.`,
          type: "registration",
          isRead: Math.random() > 0.5, // 50% chance of being read
          eventId,
          createdAt: newRegistration.createdAt,
        });
      }

      if (i % 10 === 0) {
        console.log(`Created ${i + 1} registrations...`);
      }
    }

    console.log("Test data generation completed successfully!");
    console.log(`Summary:
    - ${NUM_USERS} regular users
    - ${NUM_ORGANIZERS} organizers
    - ${NUM_EVENTS} events
    - ${NUM_REGISTRATIONS} registrations`);
  } catch (error) {
    console.error("Error generating test data:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script if it's called directly
if (require.main === module) {
  generateTestData().catch((err) => {
    console.error("Failed to generate test data:", err);
    process.exit(1);
  });
}

export default generateTestData;
