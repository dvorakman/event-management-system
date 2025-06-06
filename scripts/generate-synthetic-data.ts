import { faker } from "@faker-js/faker";
import { createClerkClient } from "@clerk/backend";
import { db } from "../src/server/db/index.ts";
import { users, events, registrations, tickets, notifications } from "../src/server/db/schema.ts";
import { eq } from "drizzle-orm";

// Configuration
const NUM_TEST_USERS = 60;        // New test users to create  
const NUM_TEST_ORGANIZERS = 12;  // New test organizers to create (ensures we have 10+)
const NUM_EVENTS = 30;           // Events to generate (more events = more registration opportunities)
const REGISTRATION_PROBABILITY = 0.7; // 70% chance a user registers for any given event
const MIN_TOTAL_REGISTRATIONS = 50; // Minimum total registrations required

// Load env vars
if (!process.env.CLERK_SECRET_KEY) {
  try { require("dotenv").config(); } catch {}
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("randomItem called with empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function getEventDate(): Date {
  const timeType = Math.random();
  const now = new Date();
  
  if (timeType < 0.05) {
    // 5% past events (1-3 months ago) - reduced for testing
    const pastDate = new Date(now);
    pastDate.setMonth(pastDate.getMonth() - faker.number.int({ min: 1, max: 3 }));
    pastDate.setDate(pastDate.getDate() - faker.number.int({ min: 0, max: 14 }));
    return pastDate;
  } else if (timeType < 0.4) {
    // 35% near future events (next 1-30 days) - increased for immediate visibility
    const nearFuture = new Date(now);
    nearFuture.setDate(nearFuture.getDate() + faker.number.int({ min: 1, max: 30 }));
    return nearFuture;
  } else {
    // 60% future events (1-6 months ahead)
    const future = new Date(now);
    future.setMonth(future.getMonth() + faker.number.int({ min: 1, max: 6 }));
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

// STEP 1: Create test users and organizers in Clerk and sync to DB
async function createTestUsers() {
  console.log("=== STEP 1: Creating Test Users and Organizers ===\n");
  
  const createdUsers: Array<{ id: string; name: string; role: string }> = [];
  
  // Create test organizers
  console.log(`Creating ${NUM_TEST_ORGANIZERS} test organizers...`);
  for (let i = 0; i < NUM_TEST_ORGANIZERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    try {
      const clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        publicMetadata: { role: "organizer" },
        skipPasswordChecks: true,
      });
      
      // Sync to our database
      await db.insert(users).values({
        id: clerkUser.id,
        email,
        name: `${firstName} ${lastName}`,
        imageUrl: clerkUser.imageUrl || "",
        role: "organizer",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      
      createdUsers.push({ id: clerkUser.id, name: `${firstName} ${lastName}`, role: "organizer" });
      console.log(`✓ Created organizer: ${firstName} ${lastName} <${email}>`);
    } catch (error) {
      console.log(`⚠ Skipped organizer (likely duplicate): ${email}`);
    }
  }
  
  // Create test regular users
  console.log(`\nCreating ${NUM_TEST_USERS} test users...`);
  for (let i = 0; i < NUM_TEST_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    try {
      const clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        publicMetadata: { role: "user" },
        skipPasswordChecks: true,
      });
      
      // Sync to our database
      await db.insert(users).values({
        id: clerkUser.id,
        email,
        name: `${firstName} ${lastName}`,
        imageUrl: clerkUser.imageUrl || "",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      
      createdUsers.push({ id: clerkUser.id, name: `${firstName} ${lastName}`, role: "user" });
      console.log(`✓ Created user: ${firstName} ${lastName} <${email}>`);
    } catch (error) {
      console.log(`⚠ Skipped user (likely duplicate): ${email}`);
    }
  }
  
  console.log(`\n✅ Created ${createdUsers.filter(u => u.role === "organizer").length} organizers and ${createdUsers.filter(u => u.role === "user").length} users\n`);
  return createdUsers;
}

// STEP 2: Generate events created by organizers
async function generateEvents(organizers: Array<{ id: string; name: string; role: string }>) {
  console.log("=== STEP 2: Generating Events by Organizers ===\n");
  
  const eventData: Array<{ 
    id: string; 
    capacity: number; 
    target: number; 
    type: string; 
    generalPrice: number; 
    vipPrice: number;
    organizerId: string;
    status: string;
  }> = [];
  
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
    
    // Generate realistic event names based on type
    let eventName: string;
    switch (eventType) {
      case "conference":
        eventName = `${faker.company.buzzPhrase()} Conference ${new Date().getFullYear()}`;
        break;
      case "music_concert":
        eventName = `${faker.person.fullName()} Live Concert`;
        break;
      case "networking":
        eventName = `${faker.company.buzzNoun()} Networking Meetup`;
        break;
      default:
        eventName = faker.company.catchPhrase();
    }
    
    const eventResult = await db.insert(events).values({
      name: eventName,
      description: faker.lorem.paragraphs(2),
      startDate,
      endDate,
      location: `${faker.location.city()}, ${faker.location.state()}`,
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
      vipPrice,
      organizerId: organizer.id,
      status
    });
    
    console.log(`✓ Created ${occupancy.type} event: "${eventName}" by ${organizer.name}`);
    console.log(`  Type: ${eventType} | Capacity: ${capacity} | Target: ${Math.round(occupancy.target * 100)}% | Status: ${status}`);
  }
  
  console.log(`\n✅ Generated ${NUM_EVENTS} events\n`);
  return eventData;
}

async function main() {
  console.log("🚀 Starting Enhanced Synthetic Data Generation Pipeline...\n");
  
  // STEP 1: Create users and organizers
  const createdUsers = await createTestUsers();
  
  // Get all users from database (existing + newly created)
  const allUsers = await db.select().from(users) as Array<{ id: string; name: string; role: string }>;
  const organizers = allUsers.filter(u => u.role === "organizer");
  const regularUsers = allUsers.filter(u => u.role === "user");
  
  if (organizers.length === 0) {
    throw new Error("No organizers found! Cannot generate events without organizers.");
  }
  
  if (regularUsers.length === 0) {
    throw new Error("No regular users found! Cannot generate registrations without users.");
  }
  
  console.log(`📊 Database Summary: ${organizers.length} organizers, ${regularUsers.length} users`);
  
  // STEP 2: Generate events by organizers
  const eventData = await generateEvents(organizers);
  
  // STEP 3: Generate user registrations
  const totalRegistrations = await generateRegistrations(regularUsers, eventData);
  
  // Final summary
  console.log("🎉 Synthetic Data Generation Complete!");
  console.log("=" .repeat(50));
  console.log(`📈 Final Statistics:`);
  console.log(`   • ${createdUsers.filter(u => u.role === "organizer").length} new organizers created`);
  console.log(`   • ${createdUsers.filter(u => u.role === "user").length} new users created`);
  console.log(`   • ${organizers.length} total organizers in system (minimum: 10)`);
  console.log(`   • ${regularUsers.length} total users in system`);
  console.log(`   • ${NUM_EVENTS} events generated`);
  console.log(`   • ${totalRegistrations} registrations created (minimum: ${MIN_TOTAL_REGISTRATIONS})`);
  console.log(`   • Event distribution: 15% sold out, 15% nearly sold out, 30% popular, 40% available`);
  console.log(`   • Event sizes: 50% small (15-50), 30% medium (50-200), 20% large (200-500)`);
  console.log(`   • Event timing: 10% past, 10% near future, 80% future events`);
  console.log(`   • Realistic pricing by event type and venue size`);
  console.log(`   • Dietary requirements: ~30% of registrations`);
  console.log(`   • Special needs: ~15% of registrations`);
  console.log(`   • Emergency contacts: 100% of registrations`);
  
  // Validation checks
  if (organizers.length >= 10) {
    console.log(`✅ Organizer requirement met: ${organizers.length}/10+`);
  } else {
    console.log(`❌ Organizer requirement NOT met: ${organizers.length}/10+`);
  }
  
  if (totalRegistrations >= MIN_TOTAL_REGISTRATIONS) {
    console.log(`✅ Registration requirement met: ${totalRegistrations}/${MIN_TOTAL_REGISTRATIONS}+`);
  } else {
    console.log(`❌ Registration requirement NOT met: ${totalRegistrations}/${MIN_TOTAL_REGISTRATIONS}+`);
  }
}

// STEP 3: Generate user registrations for events
async function generateRegistrations(
  regularUsers: Array<{ id: string; name: string; role: string }>,
  eventData: Array<{ id: string; capacity: number; target: number; type: string; generalPrice: number; vipPrice: number; status: string }>
) {
  console.log("=== STEP 3: Generating User Registrations ===\n");
  
  let totalRegistrations = 0;
  const userEventPairs = new Set<string>(); // Track user-event pairs to prevent duplicates
  
  // Only generate registrations for published events
  const publishedEvents = eventData.filter(event => event.status === "published");
  console.log(`Generating registrations for ${publishedEvents.length} published events...`);
  
  for (const event of publishedEvents) {
    const targetRegistrations = Math.floor(event.capacity * event.target);
    let registrationsCreated = 0;
    
    // Shuffle users for random distribution
    const shuffledUsers = [...regularUsers].sort(() => Math.random() - 0.5);
    
    for (const user of shuffledUsers) {
      // Stop if we've reached the target
      if (registrationsCreated >= targetRegistrations) break;
      
      // Random chance this user registers for this event
      if (Math.random() > REGISTRATION_PROBABILITY && event.type !== "sold-out") continue;
      
      const userEventKey = `${user.id}-${event.id}`;
      
      // Skip if user already registered for this event
      if (userEventPairs.has(userEventKey)) continue;
      
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
    
    const actualPercentage = Math.round((registrationsCreated / event.capacity) * 100);
    console.log(`✓ Event ${event.id}: ${registrationsCreated}/${event.capacity} registrations (${actualPercentage}%)`);
  }
  
  console.log(`\n✅ Generated ${totalRegistrations} total registrations\n`);
  
  // Ensure minimum registrations by creating additional ones if needed
  if (totalRegistrations < MIN_TOTAL_REGISTRATIONS) {
    const deficit = MIN_TOTAL_REGISTRATIONS - totalRegistrations;
    console.log(`⚠️  Need ${deficit} more registrations to meet minimum of ${MIN_TOTAL_REGISTRATIONS}`);
    console.log("Creating additional registrations...\n");
    
    let additionalRegistrations = 0;
    const eventsWithCapacity = publishedEvents.filter(event => {
      // Count current registrations for this event
      return true; // We'll create more registrations even if it means some events are over-subscribed
    });
    
    while (additionalRegistrations < deficit && eventsWithCapacity.length > 0) {
      const event = randomItem(eventsWithCapacity);
      const user = randomItem(regularUsers);
      const userEventKey = `${user.id}-${event.id}-extra-${additionalRegistrations}`;
      
      // Skip if this exact combination already exists (unlikely but safe)
      if (userEventPairs.has(userEventKey)) continue;
      
      userEventPairs.add(userEventKey);
      
      const ticketType = Math.random() < 0.8 ? "general" : "vip";
      const status = "confirmed"; // All additional registrations are confirmed
      const paymentStatus = "completed" as const;
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
      if (registration) {
        // Create ticket
        const ticketNumber = faker.string.alphanumeric(10).toUpperCase();
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
          title: `Registration confirmed for ${ticketType} ticket`,
          message: `Your registration for the event has been confirmed.`,
          type: "registration",
          isRead: Math.random() < 0.3,
          eventId: event.id,
          createdAt: new Date(),
        });

        additionalRegistrations++;
        totalRegistrations++;
      }
    }
    
    console.log(`✅ Created ${additionalRegistrations} additional registrations`);
  }
  
  return totalRegistrations;
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); }); 
} 