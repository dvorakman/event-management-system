import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const CLERK_API_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_URL = "https://api.clerk.com/v1";

async function fetchClerkUsers() {
  console.log(`Using Clerk Secret Key: ${CLERK_API_KEY?.substring(0, 10)}...`);
  
  const response = await fetch(`${CLERK_API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${CLERK_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch users from Clerk: ${errorText}`);
  }

  const data = await response.json();
  console.log("Raw Clerk response:", JSON.stringify(data, null, 2));
  return data;
}

async function syncExistingUsers() {
  console.log("Starting user synchronization...");
  
  try {
    const clerkUsers = await fetchClerkUsers();
    console.log(`Found ${clerkUsers.length} users in Clerk`);

    for (const user of clerkUsers) {
      console.log(`Processing user: ${user.id} (${user.email_addresses[0]?.email_address})`);
      console.log("User data:", JSON.stringify(user, null, 2));

      try {
        // Get the primary email
        const primaryEmail = user.email_addresses[0]?.email_address;
        if (!primaryEmail) continue;

        // Construct the name field
        let name = "";
        if (user.first_name && user.last_name) {
          name = `${user.first_name} ${user.last_name}`.trim();
        } else if (user.first_name) {
          name = user.first_name;
        } else if (user.username) {
          name = user.username;
        } else {
          name = primaryEmail.split("@")[0]; // Use email username as last resort
        }

        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.id, user.id));

        if (existingUser.length === 0) {
          // Create new user
          await db.insert(users).values({
            id: user.id,
            email: primaryEmail,
            name: name,
            role: "user",
            createdAt: new Date(user.created_at),
            updatedAt: new Date(),
            notifications: {
              email: true,
              push: true,
            },
            privacy: {
              profile: "public",
              events: "private",
            },
          });
          console.log(`Created new user: ${name} (${primaryEmail})`);
        } else {
          // Update existing user
          await db
            .update(users)
            .set({
              email: primaryEmail,
              name: name,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          console.log(`Updated existing user: ${name} (${primaryEmail})`);
        }
      } catch (error) {
        console.error(`Error syncing user ${user.id}:`, error);
      }
    }

    console.log("User synchronization completed successfully");
  } catch (error) {
    console.error("Error during synchronization:", error);
    throw error;
  }
}

// Connect to the database
console.log("Using PostgreSQL database from DATABASE_URL");

// Run the sync
syncExistingUsers().catch((error) => {
  console.error("Failed to sync users:", error);
  process.exit(1);
}); 