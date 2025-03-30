import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

const CLERK_API_URL = 'https://api.clerk.com/v1';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const EVENT_MANAGEMENT_ORG_ID = process.env.EVENT_MANAGEMENT_ORG_ID;

console.log('Using Clerk Secret Key:', CLERK_SECRET_KEY?.substring(0, 10) + '...');

async function fetchUserOrganizations(userId: string) {
  console.log(`Fetching organization memberships for user ${userId}`);
  console.log(`Using Clerk API URL: ${CLERK_API_URL}`);
  console.log(`Using Clerk Secret Key: ${CLERK_SECRET_KEY?.substring(0, 10)}...`);

  try {
    const response = await fetch(
      `${CLERK_API_URL}/users/${userId}/organization_memberships`,
      {
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Error fetching organization memberships: ${response.status}`);
      console.error(`Response text: ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    console.log(`Organization memberships response:`, JSON.stringify(data, null, 2));

    // Find membership for EVENT_MANAGEMENT_ORG_ID
    const membership = data.data?.find(
      (m: any) => m.organization.id === EVENT_MANAGEMENT_ORG_ID
    );

    if (membership) {
      console.log(`Found membership for organization ${EVENT_MANAGEMENT_ORG_ID}:`, membership);
      return membership;
    } else {
      console.log(`No membership found for organization ${EVENT_MANAGEMENT_ORG_ID}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching organization memberships:', error);
    return null;
  }
}

function determineUserRole(membership: any) {
  if (!membership) {
    console.log('No membership found, defaulting to "user" role');
    return 'user';
  }

  console.log(`Determining role from membership:`, membership);
  const role = membership.role;

  switch (role) {
    case 'org:admin':
      console.log('User is an admin');
      return 'admin';
    case 'org:member':
      console.log('User is an organizer');
      return 'organizer';
    default:
      console.log(`Unknown role "${role}", defaulting to "user"`);
      return 'user';
  }
}

async function fetchClerkUsers() {
  console.log(`Using Clerk Secret Key: ${CLERK_SECRET_KEY?.substring(0, 10)}...`);
  
  const response = await fetch(`${CLERK_API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
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

export async function syncExistingUsers() {
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

        // Fetch organization memberships and determine role
        const membership = await fetchUserOrganizations(user.id);
        const role = determineUserRole(membership);
        console.log(`Determined role for user ${user.id}: ${role}`);

        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.id, user.id));

        if (existingUser.length === 0) {
          // Create new user
          await db.insert(users).values({
            id: user.id,
            email: primaryEmail,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            username: user.username || null,
            profileImage: user.profile_image_url || null,
            role: role,
            externalId: user.external_id || null,
            metadata: JSON.stringify({
              publicMetadata: user.public_metadata,
              privateMetadata: user.private_metadata,
              unsafeMetadata: user.unsafe_metadata,
            }),
            lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
            createdAt: new Date(user.created_at),
            updatedAt: new Date(),
          });
          console.log(`Created new user: ${user.username || primaryEmail}`);
        } else {
          // Update existing user
          await db
            .update(users)
            .set({
              email: primaryEmail,
              firstName: user.first_name || null,
              lastName: user.last_name || null,
              username: user.username || null,
              profileImage: user.profile_image_url || null,
              role: role,
              externalId: user.external_id || null,
              metadata: JSON.stringify({
                publicMetadata: user.public_metadata,
                privateMetadata: user.private_metadata,
                unsafeMetadata: user.unsafe_metadata,
              }),
              lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          console.log(`Updated existing user: ${user.username || primaryEmail}`);
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

// Export a function that can be called from scripts or server startup
export async function syncUsers() {
  try {
    await syncExistingUsers();
    return true;
  } catch (error) {
    console.error("Failed to sync users:", error);
    return false;
  }
}

// Execute if this file is run directly
if (import.meta.url.endsWith('sync-users.ts')) {
  console.log("Running user synchronization...");
  syncUsers()
    .then((success) => {
      if (success) {
        console.log("User synchronization completed successfully");
        process.exit(0);
      } else {
        console.error("User synchronization failed");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Failed to sync users:", error);
      process.exit(1);
    });
} 