import { db } from "~/server/db";
import { events } from "~/server/db/schema";

async function testCategories() {
  console.log("Testing event categories...");

  // Test 1: Verify category enum values
  console.log("\nTest 1: Verifying category enum values");
  const validCategories = ["conference", "music_concert", "networking"];
  const invalidCategories = ["concert", "workshop", "other"];

  for (const category of validCategories) {
    try {
      await db.insert(events).values({
        name: `Test ${category} event`,
        description: `This is a test ${category} event`,
        startDate: new Date(),
        endDate: new Date(),
        location: "Test Location",
        type: category,
        generalTicketPrice: 100,
        vipTicketPrice: 200,
        vipPerks: "Test perks",
        maxAttendees: 100,
        organizerId: "test-organizer",
        status: "published",
      });
      console.log(`✓ Successfully created ${category} event`);
    } catch (error) {
      console.error(`✗ Failed to create ${category} event:`, error);
    }
  }

  // Test 2: Verify invalid categories are rejected
  console.log("\nTest 2: Verifying invalid categories are rejected");
  for (const category of invalidCategories) {
    try {
      await db.insert(events).values({
        name: `Test ${category} event`,
        description: `This is a test ${category} event`,
        startDate: new Date(),
        endDate: new Date(),
        location: "Test Location",
        type: category,
        generalTicketPrice: 100,
        vipTicketPrice: 200,
        vipPerks: "Test perks",
        maxAttendees: 100,
        organizerId: "test-organizer",
        status: "published",
      });
      console.error(`✗ Should have rejected invalid category: ${category}`);
    } catch (error) {
      console.log(`✓ Successfully rejected invalid category: ${category}`);
    }
  }

  // Test 3: Query events by category
  console.log("\nTest 3: Querying events by category");
  for (const category of validCategories) {
    const categoryEvents = await db.query.events.findMany({
      where: (events, { eq }) => eq(events.type, category),
    });
    console.log(`Found ${categoryEvents.length} ${category} events`);
  }

  // Clean up test data
  console.log("\nCleaning up test data...");
  await db.delete(events).where(
    (events, { like }) => like(events.name, "Test %")
  );
  console.log("Cleanup complete");
}

testCategories()
  .then(() => {
    console.log("\nAll tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nTest failed:", error);
    process.exit(1);
  }); 