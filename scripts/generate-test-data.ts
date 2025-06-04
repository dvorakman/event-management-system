import { db } from "../src/server/db/index.js";
import { users, events, registrations, tickets, notifications } from "../src/server/db/schema.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

// Configuration
const NUM_ORGANIZERS = 10;
const NUM_USERS = 30;
const NUM_EVENTS = 45;
const NUM_REGISTRATIONS = 50;

// Helper function to generate random date within a range
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function generateTestData() {
  console.log("Starting test data generation...");

  // Clear existing data
  console.log("Clearing existing data...");
  await db.delete(tickets);
  await db.delete(notifications);
  await db.delete(registrations);
  await db.delete(events);
  await db.delete(users);

  // Generate organizers
  console.log("Generating organizers...");
  const organizers = await Promise.all(
    Array.from({ length: NUM_ORGANIZERS }, async () => {
      const [user] = await db
        .insert(users)
        .values({
          id: faker.string.uuid(),
          email: faker.internet.email(),
          name: faker.person.fullName(),
          role: "organizer",
        })
        .returning();
      return user;
    })
  );

  // Generate regular users
  console.log("Generating regular users...");
  const regularUsers = await Promise.all(
    Array.from({ length: NUM_USERS }, async () => {
      const [user] = await db
        .insert(users)
        .values({
          id: faker.string.uuid(),
          email: faker.internet.email(),
          name: faker.person.fullName(),
          role: "user",
        })
        .returning();
      return user;
    })
  );

  // Generate events
  console.log("Generating events...");
  const eventTypes = ["conference", "music_concert", "networking"] as const;
  const eventStatuses = ["draft", "published", "cancelled", "completed"] as const;
  
  // First, create several events of each category type
  for (const type of eventTypes) {
    // Create 5 events of each type, all published
    for (let i = 0; i < 5; i++) {
      const startDate = randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
      const endDate = new Date(startDate.getTime() + (2 + Math.random() * 3) * 24 * 60 * 60 * 1000);
      
      await db
        .insert(events)
        .values({
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Event ${i + 1}`,
          description: `This is a sample ${type} event`,
          startDate,
          endDate,
          location: `${faker.location.city()}, ${faker.location.country()}`,
          type,
          generalTicketPrice: faker.number.float({ min: 10, max: 100, precision: 0.01 }),
          vipTicketPrice: faker.number.float({ min: 100, max: 500, precision: 0.01 }),
          vipPerks: faker.lorem.sentence(),
          maxAttendees: faker.number.int({ min: 50, max: 1000 }),
          organizerId: faker.helpers.arrayElement(organizers).id,
          status: "published",
        });
    }
  }

  // Then generate random events
  const remainingEvents = NUM_EVENTS - (eventTypes.length * 5);
  const allEvents = await Promise.all(
    Array.from({ length: remainingEvents }, async () => {
      const startDate = randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
      const endDate = new Date(startDate.getTime() + (2 + Math.random() * 3) * 24 * 60 * 60 * 1000);
      
      const [event] = await db
        .insert(events)
        .values({
          name: faker.company.catchPhrase(),
          description: faker.lorem.paragraphs(2),
          startDate,
          endDate,
          location: `${faker.location.city()}, ${faker.location.country()}`,
          type: faker.helpers.arrayElement(eventTypes),
          generalTicketPrice: faker.number.float({ min: 10, max: 100, precision: 0.01 }),
          vipTicketPrice: faker.number.float({ min: 100, max: 500, precision: 0.01 }),
          vipPerks: faker.lorem.sentence(),
          maxAttendees: faker.number.int({ min: 50, max: 1000 }),
          organizerId: faker.helpers.arrayElement(organizers).id,
          status: faker.helpers.arrayElement(["published", "published", "published", "draft", "cancelled"]), // 60% chance of published
        })
        .returning();
      return event;
    })
  );

  // Generate registrations and tickets
  console.log("Generating registrations and tickets...");
  const registrationStatuses = ["pending", "confirmed", "cancelled", "refunded"] as const;
  const paymentStatuses = ["pending", "completed", "failed", "refunded"] as const;
  const ticketTypes = ["general", "vip"] as const;

  for (let i = 0; i < NUM_REGISTRATIONS; i++) {
    const event = faker.helpers.arrayElement(allEvents);
    const user = faker.helpers.arrayElement(regularUsers);
    const ticketType = faker.helpers.arrayElement(ticketTypes);
    const ticketPrice = ticketType === "general" ? event.generalTicketPrice : event.vipTicketPrice;

    const registrationResult = await db
      .insert(registrations)
      .values({
        userId: user.id,
        eventId: event.id,
        ticketType,
        status: faker.helpers.arrayElement(registrationStatuses),
        paymentStatus: faker.helpers.arrayElement(paymentStatuses),
        totalAmount: ticketPrice,
      })
      .returning();

    if (!registrationResult[0]) {
      console.error("Failed to create registration");
      continue;
    }

    const registration = registrationResult[0];

    // Generate ticket for the registration
    await db.insert(tickets).values({
      registrationId: registration.id,
      ticketNumber: faker.string.alphanumeric(10).toUpperCase(),
      qrCode: faker.string.uuid(),
      isUsed: faker.datatype.boolean(),
    });

    // Generate notification for the registration
    await db.insert(notifications).values({
      userId: user.id,
      title: `Registration for ${event.name}`,
      message: `Your registration for ${event.name} has been ${registration.status}.`,
      type: "registration",
      isRead: faker.datatype.boolean(),
      eventId: event.id,
    });
  }

  console.log("Test data generation completed successfully!");
}

// Run the script
generateTestData()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error generating test data:", error);
    process.exit(1);
  }); 