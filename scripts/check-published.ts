import { db } from "../src/server/db/index.js";
import { events } from "../src/server/db/schema.js";
import { eq } from "drizzle-orm";

async function checkPublishedEvents() {
  console.log("Checking published events...");

  const publishedEvents = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"));

  console.log(`\nTotal published events: ${publishedEvents.length}`);
  
  // Count by category
  const categoryCounts = publishedEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nPublished events by category:");
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`${category}: ${count}`);
  });
}

checkPublishedEvents()
  .then(() => {
    console.log("\nCheck completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error checking published events:", error);
    process.exit(1);
  }); 