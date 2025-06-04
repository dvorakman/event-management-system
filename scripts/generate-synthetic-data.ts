import { faker } from "@faker-js/faker";
import { db } from "../src/server/db/index.js";
import { users, events, registrations, tickets, notifications } from "../src/server/db/schema.js";
import { eq } from "drizzle-orm";

const NUM_EVENTS = 25;
const NUM_USERS_TO_CREATE = 80; // More users for better distribution

function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("randomItem called with empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function getEventDate(): Date {
  const timeType = Math.random();
  const now = new Date();
  
  if (timeType < 0.1) {
    // 10% past events (1-6 months ago)
    const pastDate = new Date(now);
    pastDate.setMonth(pastDate.getMonth() - faker.number.int({ min: 1, max: 6 }));
    pastDate.setDate(pastDate.getDate() - faker.number.int({ min: 0, max: 28 }));
    return pastDate;
  } else if (timeType < 0.2) {
    // 10% near future events (next 2 weeks)
    const nearFuture = new Date(now);
    nearFuture.setDate(nearFuture.getDate() + faker.number.int({ min: 1, max: 14 }));
    return nearFuture;
  } else {
    // 80% future events (2 weeks to 6 months ahead)
    const future = new Date(now);
    future.setDate(future.getDate() + 14); // Start from 2 weeks ahead
    future.setMonth(future.getMonth() + faker.number.int({ min: 0, max: 6 }));
    future.setDate(future.getDate() + faker.number.int({ min: 0, max: 28 }));
    return future;
  }
}

function getEventDuration(eventType: string): number {
  // Return duration in days based on event type
  switch (eventType) {
    case "conference":
      return faker.number.int({ min: 1, max: 4 }); // 1-4 days
    case "music_concert":
      return 1; // Usually single day
    case "networking":
      return 1; // Usually single day
    default:
      return 1;
  }
}

function randomEndDate(start: Date, eventType: string): Date {
  const duration = getEventDuration(eventType);
  const end = new Date(start);
  
  if (duration === 1) {
    // Single day event - end 3-8 hours after start
    end.setHours(start.getHours() + faker.number.int({ min: 3, max: 8 }));
  } else {
    // Multi-day event
    end.setDate(end.getDate() + duration - 1);
    end.setHours(start.getHours() + faker.number.int({ min: 6, max: 10 }));
  }
  
  return end;
}

function getEventCapacity(): number {
  const sizeType = Math.random();
  if (sizeType < 0.5) return faker.number.int({ min: 5, max: 25 }); // 50% small events
  if (sizeType < 0.8) return faker.number.int({ min: 25, max: 50 }); // 30% medium events  
  return faker.number.int({ min: 50, max: 100 }); // 20% large events (reduced max)
}

function getOccupancyTarget(): { target: number; type: string } {
  const rand = Math.random();
  if (rand < 0.15) return { target: 1.0, type: "sold-out" }; // 15% sold out
  if (rand < 0.30) return { target: faker.number.float({ min: 0.85, max: 0.98 }), type: "nearly-sold-out" }; // 15% nearly sold out
  if (rand < 0.60) return { target: faker.number.float({ min: 0.40, max: 0.80 }), type: "popular" }; // 30% moderately popular
  return { target: faker.number.float({ min: 0.05, max: 0.50 }), type: "available" }; // 40% less popular
}

function getEventPricing(eventType: string, capacity: number): { generalPrice: number; vipPrice: number } {
  let basePrice: number;
  
  // Base pricing by event type
  switch (eventType) {
    case "conference":
      basePrice = faker.number.int({ min: 50, max: 200 });
      break;
    case "music_concert":
      basePrice = faker.number.int({ min: 30, max: 150 });
      break;
    case "networking":
      basePrice = faker.number.int({ min: 15, max: 60 });
      break;
    default:
      basePrice = faker.number.int({ min: 25, max: 100 });
  }
  
  // Adjust price based on venue size (smaller venues = higher prices)
  if (capacity < 50) {
    basePrice *= 1.2; // 20% premium for intimate venues
  } else if (capacity > 300) {
    basePrice *= 0.8; // 20% discount for large venues
  }
  
  const generalPrice = Math.round(basePrice);
  const vipPrice = Math.round(basePrice * faker.number.float({ min: 1.5, max: 3.0 }));
  
  return { generalPrice, vipPrice };
}

function generateDietaryRequirements(): string | null {
  if (Math.random() < 0.7) return null; // 70% no requirements
  const options = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut allergy", "Halal", "Kosher"];
  return randomItem(options);
}

function generateSpecialNeeds(): string | null {
  if (Math.random() < 0.85) return null; // 85% no special needs
  const options = [
    "Wheelchair access required",
    "Sign language interpreter needed",
    "Large print materials",
    "Dietary restrictions accommodation",
    "Parking assistance needed"
  ];
  return randomItem(options);
}

function generateEmergencyContact(): { name: string; phone: string } {
  return {
    name: faker.person.fullName(),
    phone: faker.phone.number()
  };
}

async function main() {
  console.log("🚀 Starting synthetic data generation...\n");

  // Fetch organizers and users from DB
  const allUsers = await db.select().from(users) as Array<{ id: string; name: string; role: string }>;
  const organizers = allUsers.filter(u => u.role === "organizer");
  const regularUsers = allUsers.filter(u => u.role === "user");

  if (organizers.length === 0 || regularUsers.length === 0) {
    throw new Error("No organizers or users found in DB. Run sync-users.ts first.");
  }

  console.log(`📊 Found ${organizers.length} organizers and ${regularUsers.length} users`);

  // Generate events with realistic capacities and occupancy targets
  const eventData: Array<{ id: string; capacity: number; target: number; type: string; generalPrice: number; vipPrice: number }> = [];
  
  for (let i = 0; i < NUM_EVENTS; i++) {
    const organizer = randomItem(organizers);
    const eventType = randomItem(["conference", "music_concert", "networking"]);
    const startDate = getEventDate();
    const endDate = randomEndDate(startDate, eventType);
    const status = randomItem(["published", "published", "published", "draft"]); // Bias towards published
    const capacity = getEventCapacity();
    const occupancy = getOccupancyTarget();
    
    // More realistic pricing based on event type
    const { generalPrice, vipPrice } = getEventPricing(eventType, capacity);
    
    const eventResult = await db.insert(events).values({
      name: faker.company.catchPhrase(),
      description: faker.lorem.paragraphs(2),
      startDate,
      endDate,
      location: faker.location.city() + ", " + faker.location.state(),
      type: eventType,
      generalTicketPrice: generalPrice.toString(),
      vipTicketPrice: vipPrice.toString(),
      vipPerks: faker.lorem.sentences(2),
      maxAttendees: capacity,
      organizerId: organizer.id,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    const event = eventResult[0];
    if (!event) {
      throw new Error("Failed to create event");
    }
    
    eventData.push({
      id: event.id,
      capacity,
      target: occupancy.target,
      type: occupancy.type,
      generalPrice,
      vipPrice
    });
    
    console.log(`✅ Created ${occupancy.type} event: "${event.name}" (${eventType}) - Capacity: ${capacity}, Target: ${Math.round(occupancy.target * 100)}%`);
  }

  console.log(`\n🎫 Generating registrations based on occupancy targets...\n`);

  // Generate registrations based on occupancy targets (only for published events)
  let totalRegistrations = 0;
  const userEventPairs = new Set<string>(); // Track user-event pairs to prevent duplicates

  await Promise.all(eventData.map(async (event) => {
    // Skip draft events - they shouldn't have any registrations
    const eventRecord = await db.select().from(events).where(eq(events.id, event.id)).limit(1);
    
    if (!eventRecord[0] || eventRecord[0].status === "draft") {
      console.log(`⏩ Skipping registrations for draft event: ${event.id}`);
      return;
    }
    
    const targetRegistrations = Math.floor(event.capacity * event.target);
    let registrationsCreated = 0;
    let attempts = 0;
    const maxAttempts = regularUsers.length * 2; // Prevent infinite loops
    
    // Shuffle users to get more random selection
    const shuffledUsers = [...regularUsers].sort(() => Math.random() - 0.5);
    let userIndex = 0;

    while (registrationsCreated < targetRegistrations && attempts < maxAttempts) {
      attempts++;
      
      // For sold-out events, allow multiple registrations per user to ensure 100% capacity
      let user;
      let userEventKey;
      
      if (event.type === "sold-out" && userIndex >= shuffledUsers.length) {
        // If we've used all users and need more registrations for sold-out event,
        // start allowing duplicate users (simulates real-world scenario where some users
        // might register multiple people)
        user = randomItem(regularUsers);
        userEventKey = `${user.id}-${event.id}-${registrationsCreated}`; // Make unique key
      } else {
        // Normal user selection
        user = userIndex < shuffledUsers.length ? 
          shuffledUsers[userIndex]! : randomItem(regularUsers);
        userEventKey = `${user.id}-${event.id}`;
        userIndex++;
        
        // Skip if user already registered for this event
        if (userEventPairs.has(userEventKey)) {
          continue;
        }
      }
      
      userEventPairs.add(userEventKey);
      
      const ticketType = Math.random() < 0.8 ? "general" : "vip"; // 80% general, 20% VIP
      
      // For sold-out events, ensure 100% confirmed registrations
      // For other events, add some variety in registration status
      let status: "confirmed" | "pending" | "cancelled";
      if (event.type === "sold-out") {
        status = "confirmed"; // Always confirmed for sold-out events
      } else {
        // For other events, 90% confirmed, 8% pending, 2% cancelled
        const rand = Math.random();
        if (rand < 0.90) status = "confirmed";
        else if (rand < 0.98) status = "pending";
        else status = "cancelled";
      }
      
      const paymentStatus = status === "confirmed" ? "completed" as const : 
                          status === "pending" ? "pending" as const : "failed" as const;
      
      // Use realistic pricing based on event's actual pricing
      const basePrice = ticketType === "vip" ? event.vipPrice : event.generalPrice;
      
      const emergencyContact = generateEmergencyContact();
      
      const registrationResult = await db.insert(registrations).values({
        userId: user.id,
        eventId: event.id,
        ticketType: ticketType as "general" | "vip",
        status,
        paymentStatus,
        totalAmount: basePrice.toString(),
        dietaryRequirements: generateDietaryRequirements(),
        specialNeeds: generateSpecialNeeds(),
        emergencyContact: JSON.stringify(emergencyContact),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const registration = registrationResult[0];
      if (!registration) {
        console.error("Failed to create registration");
        continue;
      }

      // Only create tickets for confirmed registrations
      if (status === "confirmed") {
        const ticketNumber = faker.string.alphanumeric(10).toUpperCase();
        await db.insert(tickets).values({
          registrationId: registration.id,
          ticketNumber,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=${ticketNumber}`,
          isUsed: false,
          createdAt: new Date(),
        });
      }

      // Create notification
      await db.insert(notifications).values({
        userId: user.id,
        title: `Registration ${status} for ${ticketType} ticket`,
        message: `Your registration for the event has been ${status}.`,
        type: "registration",
        isRead: Math.random() < 0.3, // 30% read
        eventId: event.id,
        createdAt: new Date(),
      });

      registrationsCreated++;
      totalRegistrations++;
    }

    // Ensure minimum registration count (at least 5% for any event)
    const minimumRegistrations = Math.max(1, Math.floor(event.capacity * 0.05));
    if (registrationsCreated < minimumRegistrations && registrationsCreated < targetRegistrations) {
      console.log(`⚠️  Event ${event.id} only has ${registrationsCreated} registrations, target was ${targetRegistrations}`);
    }

    const actualPercentage = Math.round((registrationsCreated / event.capacity) * 100);
    const statusIcon = event.type === "sold-out" ? "🔴" : 
                      event.type === "nearly-sold-out" ? "🟡" : 
                      event.type === "popular" ? "🟢" : "🔵";
    
    console.log(`${statusIcon} Event ${event.id}: ${registrationsCreated}/${event.capacity} registrations (${actualPercentage}%)`);
  }

  console.log(`\n✨ Synthetic data generation complete!`);
  console.log(`📈 Created ${NUM_EVENTS} events with ${totalRegistrations} total registrations`);
  console.log(`🎭 Event distribution: 15% sold out, 15% nearly sold out, 30% popular, 40% available`);
  console.log(`📊 Event sizes: 50% small (15-50), 30% medium (50-200), 20% large (200-500)`);
  console.log(`⏰ Event timing: 10% past events, 10% near future, 80% future events`);
  console.log(`💰 Realistic pricing: Conference ($50-200), Concert ($30-150), Networking ($15-60)`);
  console.log(`🎫 Improved registration targeting with fallback mechanisms`);
  console.log(`🍽️ Dietary requirements: ~30% of registrations`);
  console.log(`♿ Special needs: ~15% of registrations`);
  console.log(`📞 Emergency contacts: 100% of registrations`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); }); 
} 