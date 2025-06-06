import { db } from "../src/server/db/index.ts";
import { users, events, registrations, tickets } from "../src/server/db/schema.ts";
import { count, eq, desc } from "drizzle-orm";

async function checkData() {
  console.log('🔍 Checking database content...\n');
  
  try {
    // Get basic counts
    const userCount = await db.select({ count: count() }).from(users);
    const eventCount = await db.select({ count: count() }).from(events);
    const registrationCount = await db.select({ count: count() }).from(registrations);
    const ticketCount = await db.select({ count: count() }).from(tickets);
    
    console.log('📊 Database Statistics:');
    console.log(`- Users: ${userCount[0]?.count || 0}`);
    console.log(`- Events: ${eventCount[0]?.count || 0}`);
    console.log(`- Registrations: ${registrationCount[0]?.count || 0}`);
    console.log(`- Tickets: ${ticketCount[0]?.count || 0}\n`);
    
    // Check user roles
    const organizers = await db.select().from(users).where(eq(users.role, "organizer")).limit(5);
    console.log('👥 Sample Organizers:');
    organizers.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name} (${org.email}) - ID: ${org.id}`);
    });
    
    // Check published events
    const publishedEvents = await db.select().from(events).where(eq(events.status, "published")).limit(5);
    console.log('\n📅 Sample Published Events:');
    publishedEvents.forEach((event, i) => {
      console.log(`${i + 1}. "${event.name}" - ${event.type} - $${event.generalTicketPrice}`);
      console.log(`   Organizer: ${event.organizerId}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Date: ${event.startDate}`);
    });
    
    // Check all event statuses
    console.log('\n📊 Event Status Distribution:');
    const statuses = await db.select({ 
      status: events.status, 
      count: count() 
    }).from(events).groupBy(events.status);
    
    statuses.forEach(status => {
      console.log(`- ${status.status}: ${status.count} events`);
    });
    
    // Check recent registrations
    const recentRegistrations = await db
      .select({
        id: registrations.id,
        userId: registrations.userId,
        eventId: registrations.eventId,
        status: registrations.status,
        ticketType: registrations.ticketType,
        totalAmount: registrations.totalAmount,
        createdAt: registrations.createdAt
      })
      .from(registrations)
      .orderBy(desc(registrations.createdAt))
      .limit(5);
    
    console.log('\n🎫 Recent Registrations:');
    recentRegistrations.forEach((reg, i) => {
      console.log(`${i + 1}. User ${reg.userId} -> Event ${reg.eventId}`);
      console.log(`   Status: ${reg.status} | Type: ${reg.ticketType} | Amount: $${reg.totalAmount}`);
    });
    
    // Check if there are any events with registrations
    const eventsWithRegistrations = await db
      .select({
        eventId: events.id,
        eventName: events.name,
        registrationCount: count(registrations.id)
      })
      .from(events)
      .leftJoin(registrations, eq(events.id, registrations.eventId))
      .groupBy(events.id, events.name)
      .orderBy(desc(count(registrations.id)))
      .limit(10);
    
    console.log('\n🎯 Events with Most Registrations:');
    eventsWithRegistrations.forEach((event, i) => {
      console.log(`${i + 1}. "${event.eventName}" - ${event.registrationCount} registrations`);
    });
    
    console.log('\n✅ Data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

checkData().catch(console.error); 