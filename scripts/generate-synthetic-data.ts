import { faker } from "@faker-js/faker";
import { db } from "../src/server/db";
import { users, events, registrations, tickets, notifications } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

const NUM_EVENTS = 20;
const NUM_REGISTRATIONS = 50;

function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("randomItem called with empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomFutureDate(maxMonthsAhead = 6): Date {
  const future = new Date();
  future.setMonth(future.getMonth() + Math.floor(Math.random() * maxMonthsAhead));
  future.setDate(future.getDate() + Math.floor(Math.random() * 28));
  return future;
}

function randomEndDate(start: Date, maxDaysAfter = 5): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + Math.floor(Math.random() * maxDaysAfter) + 1);
  return end;
}

async function main() {
  // Fetch organizers and users from DB
  const allUsers = await db.select().from(users) as Array<{ id: string; name: string; role: string }>;
  const organizers = allUsers.filter(u => u.role === "organizer");
  const regularUsers = allUsers.filter(u => u.role === "user");

  if (organizers.length === 0 || regularUsers.length === 0) {
    throw new Error("No organizers or users found in DB. Run sync-clerk-users.ts first.");
  }

  // Generate events
  const eventIds: string[] = [];
  for (let i = 0; i < NUM_EVENTS; i++) {
    const organizer = randomItem(organizers);
    const startDate = randomFutureDate();
    const endDate = randomEndDate(startDate);
    const eventType = randomItem(["conference", "concert", "workshop", "networking", "other"]);
    const status = randomItem(["published", "draft", "cancelled", "completed"]);
    const generalTicketPrice = faker.number.int({ min: 10, max: 100 });
    const vipTicketPrice = generalTicketPrice + faker.number.int({ min: 50, max: 200 });
    const [event] = await db.insert(events).values({
      name: faker.company.catchPhrase(),
      description: faker.lorem.paragraphs(2),
      startDate,
      endDate,
      location: faker.location.city() + ", " + faker.location.state(),
      type: eventType,
      generalTicketPrice: generalTicketPrice.toString(),
      vipTicketPrice: vipTicketPrice.toString(),
      vipPerks: faker.lorem.sentences(2),
      maxAttendees: faker.number.int({ min: 50, max: 500 }),
      organizerId: organizer.id,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    eventIds.push(event.id);
    console.log(`Created event: ${event.name} (${eventType}) by ${organizer.name}`);
  }

  // Generate registrations and tickets
  for (let i = 0; i < NUM_REGISTRATIONS; i++) {
    const user = randomItem(regularUsers);
    const eventId = randomItem(eventIds);
    const ticketType = randomItem(["general", "vip"]);
    const status = randomItem(["pending", "confirmed", "cancelled", "refunded"]);
    const paymentStatus = randomItem(["pending", "completed", "failed", "refunded"]);
    const totalAmount = ticketType === "vip" ? faker.number.int({ min: 100, max: 300 }) : faker.number.int({ min: 10, max: 100 });
    const [registration] = await db.insert(registrations).values({
      userId: user.id,
      eventId,
      ticketType,
      status,
      paymentStatus,
      totalAmount: totalAmount.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    // Create ticket
    const ticketNumber = faker.string.alphanumeric(10);
    await db.insert(tickets).values({
      registrationId: registration.id,
      ticketNumber,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=${ticketNumber}`,
      isUsed: false,
      createdAt: new Date(),
    });
    // Create notification
    await db.insert(notifications).values({
      userId: user.id,
      title: `Registration for ${registration.ticketType} ticket`,
      message: `You have registered for event #${eventId}.`,
      type: "registration",
      isRead: false,
      eventId,
      createdAt: new Date(),
    });
    console.log(`Created registration and ticket for user ${user.name} to event #${eventId}`);
  }

  console.log("\nSynthetic data generation complete.");
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); }); 
} 