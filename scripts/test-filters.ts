import { db } from "../src/server/db/index.js";
import { events } from "../src/server/db/schema.js";
import { and, eq, gte, lte, like, sql } from "drizzle-orm";

async function testFilters() {
  console.log("Testing Event Filters...\n");

  // 1. Test Keyword Search
  console.log("1. Testing Keyword Search:");
  const keywordResults = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(
      sql`(${events.name} ILIKE ${'%Conference%'} OR ${events.description} ILIKE ${'%Conference%'})`
    );
  console.log(`Events containing 'Conference': ${keywordResults[0]?.count ?? 0}`);

  // 2. Test Category Filter
  console.log("\n2. Testing Category Filter:");
  const categoryResults = await db
    .select({ 
      type: events.type,
      count: sql<number>`count(*)::int`
    })
    .from(events)
    .groupBy(events.type);
  console.log("Events by category:");
  console.table(categoryResults);

  // 3. Test Date Range Filter
  console.log("\n3. Testing Date Range Filter:");
  const now = new Date();
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const dateRangeResults = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(
      gte(events.startDate, now),
      lte(events.startDate, threeMonthsFromNow)
    ));
  console.log(`Events in next 3 months: ${dateRangeResults[0]?.count ?? 0}`);

  // 4. Test Location Filter
  console.log("\n4. Testing Location Filter:");
  const locationResults = await db
    .select({
      location: events.location,
      count: sql<number>`count(*)::int`
    })
    .from(events)
    .groupBy(events.location)
    .limit(5);
  console.log("Sample locations and event counts:");
  console.table(locationResults);

  // 5. Test Price Range Filter
  console.log("\n5. Testing Price Range Filter:");
  const priceRanges = [
    { min: 0, max: 50 },
    { min: 50, max: 100 },
    { min: 100, max: 500 }
  ];

  for (const range of priceRanges) {
    const priceResults = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(and(
        sql`CAST(${events.generalTicketPrice} AS DECIMAL) >= ${range.min}`,
        sql`CAST(${events.generalTicketPrice} AS DECIMAL) <= ${range.max}`
      ));
    console.log(`Events with price $${range.min}-$${range.max}: ${priceResults[0]?.count ?? 0}`);
  }

  // 6. Test Combined Filters
  console.log("\n6. Testing Combined Filters:");
  const combinedResults = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(
      eq(events.type, "conference"),
      gte(events.startDate, now),
      sql`CAST(${events.generalTicketPrice} AS DECIMAL) <= 200`
    ));
  console.log(`Upcoming conferences under $200: ${combinedResults[0]?.count ?? 0}`);

  // 7. Test Sorting
  console.log("\n7. Testing Sorting:");
  const sortedByPrice = await db
    .select({
      name: events.name,
      price: events.generalTicketPrice
    })
    .from(events)
    .orderBy(sql`CAST(${events.generalTicketPrice} AS DECIMAL)`)
    .limit(5);
  console.log("5 cheapest events:");
  console.table(sortedByPrice);

  console.log("\nFilter testing completed!");
}

// Run the tests
testFilters()
  .then(() => {
    console.log("All tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running tests:", error);
    process.exit(1);
  }); 