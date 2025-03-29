import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users, events, registrations, tickets, notifications } from "~/server/db/schema";
import { sql } from "drizzle-orm";
import postgres from "postgres";

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    // Clear existing data
    await db.delete(notifications);
    await db.delete(tickets);
    await db.delete(registrations);
    await db.delete(events);
    await db.delete(users);

    console.log("🧹 Cleared existing data");

    // Create 10 organizers
    const organizers = [];
    for (let i = 0; i < 10; i++) {
      const organizer = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        phoneNumber: faker.phone.number(),
        profilePicture: faker.image.avatar(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        country: faker.location.country(),
        biography: faker.lorem.paragraph(),
        communicationPrefs: JSON.stringify({
          email: true,
          push: faker.datatype.boolean(),
        }),
        privacySettings: JSON.stringify({
          profile: "public",
          events: faker.helpers.arrayElement(["public", "private"]),
        }),
        tosAccepted: true,
        tosAcceptedAt: faker.date.past(),
        role: "organizer",
        lastLoginAt: faker.date.recent(),
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      };
      organizers.push(organizer);
    }

    await db.insert(users).values(organizers);
    console.log("👥 Created 10 organizers");

    // Create 20 events (2 per organizer on average)
    const eventTypes = ["conference", "concert", "workshop", "networking", "other"];
    const eventStatuses = ["draft", "published", "cancelled", "completed"];
    const eventsData = [];

    for (let i = 0; i < 20; i++) {
      const startDate = faker.date.future();
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + faker.number.int({ min: 2, max: 72 }));

      const generalTicketPrice = faker.number.float({ min: 10, max: 200, precision: 2 });
      const vipTicketPrice = generalTicketPrice * faker.number.float({ min: 1.5, max: 3, precision: 0.1 });

      const event = {
        name: faker.company.catchPhrase(),
        description: faker.lorem.paragraphs(2),
        startDate,
        endDate,
        location: `${faker.location.city()}, ${faker.location.country()}`,
        type: faker.helpers.arrayElement(eventTypes),
        generalTicketPrice,
        vipTicketPrice,
        vipPerks: faker.lorem.sentences(3),
        maxAttendees: faker.number.int({ min: 50, max: 500 }),
        organizerId: faker.helpers.arrayElement(organizers).id,
        status: faker.helpers.arrayElement(eventStatuses),
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      };
      eventsData.push(event);
    }

    await db.insert(events).values(eventsData);
    console.log("📅 Created 20 events");

    // Create 50 registrations
    const registrationsData = [];
    const ticketsData = [];
    const notificationsData = [];

    const createdEvents = await db.select().from(events);

    for (let i = 0; i < 50; i++) {
      const event = faker.helpers.arrayElement(createdEvents);
      const ticketType = faker.helpers.arrayElement(["general", "vip"]);
      const ticketPrice = ticketType === "general" ? event.generalTicketPrice : event.vipTicketPrice;

      const registration = {
        userId: faker.helpers.arrayElement(organizers).id,
        eventId: event.id,
        ticketType,
        status: faker.helpers.arrayElement(["pending", "confirmed", "cancelled", "refunded"]),
        paymentStatus: faker.helpers.arrayElement(["pending", "completed", "failed", "refunded"]),
        totalAmount: ticketPrice,
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      };

      const [insertedRegistration] = await db.insert(registrations).values(registration).returning();

      // Create ticket for confirmed registrations
      if (registration.status === "confirmed") {
        const ticket = {
          registrationId: insertedRegistration.id,
          ticketNumber: faker.string.alphanumeric(10).toUpperCase(),
          qrCode: faker.image.dataUri(),
          isUsed: faker.datatype.boolean(),
          createdAt: registration.createdAt,
        };
        ticketsData.push(ticket);
      }

      // Create notification for the registration
      const notification = {
        userId: registration.userId,
        title: `Registration ${registration.status} for ${event.name}`,
        message: faker.lorem.sentence(),
        type: "registration",
        isRead: faker.datatype.boolean(),
        eventId: event.id,
        createdAt: registration.createdAt,
      };
      notificationsData.push(notification);
    }

    await db.insert(tickets).values(ticketsData);
    await db.insert(notifications).values(notificationsData);

    console.log("🎟️ Created 50 registrations with tickets and notifications");
    console.log("✅ Database seeding completed!");
  } catch (e) {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  }
}

// Run the main function and handle the promise
main()
  .then(() => {
    console.log("🔌 Closing database connection...");
    // Access the database client directly from the imported db object
    const client = (db as any).client ?? (db as any).$pool;
    if (client) {
      return client.end().then(() => {
        console.log("👋 Database connection closed");
        process.exit(0);
      });
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Error in main:", e);
    process.exit(1);
  }); 