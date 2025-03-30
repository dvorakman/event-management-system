import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { createClerkClient } from '@clerk/clerk-sdk-node';
import type { OrganizationMembership } from '@clerk/clerk-sdk-node';

// Load environment variables from .env file
config();

const DEV_ORG_ID = "org_2uhiVWqO42Gg9QpwFMtarlywYwA";
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

console.log('Using Clerk Secret Key:', process.env.CLERK_SECRET_KEY?.substring(0, 10) + '...');

async function fetchUserOrganizations(userId: string) {
  console.log(`Fetching organization memberships for user ${userId}`);
  
  try {
    const { data: memberships } = await clerk.users.getOrganizationMembershipList({
      userId: userId
    });

    console.log(`Found ${memberships.length} organization memberships`);

    // Find membership in the development organization
    const devOrgMembership = memberships.find((m: OrganizationMembership) => 
      m.organization.id === DEV_ORG_ID
    );

    if (devOrgMembership) {
      console.log(`Found membership in dev organization:`, devOrgMembership);
      return devOrgMembership;
    } else {
      console.log(`No membership found in dev organization`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching organization memberships:', error);
    return null;
  }
}

function determineUserRole(membership: OrganizationMembership | null) {
  if (!membership) {
    console.log('No membership found, defaulting to "user" role');
    return 'user';
  }

  console.log(`Determining role from membership:`, membership);
  const role = membership.role;

  // If user is in dev organization and is an admin, they get admin role
  if (membership.organization.id === DEV_ORG_ID && role === 'org:admin') {
    console.log('User is a dev org admin - assigning admin role');
    return 'admin';
  }

  // Otherwise map other roles
  switch (role) {
    case 'org:admin':
      console.log('User is an organizer (org admin but not in dev org)');
      return 'organizer';
    case 'org:member':
      console.log('User is a regular member');
      return 'user';
    default:
      console.log(`Unknown role "${role}", defaulting to "user"`);
      return 'user';
  }
}

async function fetchClerkUsers() {
  try {
    const { data: users } = await clerk.users.getUserList();
    console.log(`Found ${users.length} users in Clerk`);
    return users;
  } catch (error) {
    console.error("Error fetching users from Clerk:", error);
    throw error;
  }
}

export async function syncExistingUsers() {
  console.log("Starting user synchronization...");
  
  try {
    const clerkUsers = await fetchClerkUsers();
    console.log(`Found ${clerkUsers.length} users in Clerk`);

    for (const user of clerkUsers) {
      console.log(`Processing user: ${user.id} (${user.emailAddresses[0]?.emailAddress})`);
      console.log("User data:", JSON.stringify(user, null, 2));

      try {
        // Get the primary email
        const primaryEmail = user.emailAddresses[0]?.emailAddress;
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
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            username: user.username || null,
            profileImage: user.imageUrl || null,
            role: role,
            externalId: user.externalId || null,
            metadata: JSON.stringify({
              publicMetadata: user.publicMetadata,
              privateMetadata: user.privateMetadata,
              unsafeMetadata: user.unsafeMetadata,
            }),
            lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(),
          });
          console.log(`Created new user: ${user.username || primaryEmail}`);
        } else {
          // Update existing user
          await db
            .update(users)
            .set({
              email: primaryEmail,
              firstName: user.firstName || null,
              lastName: user.lastName || null,
              username: user.username || null,
              profileImage: user.imageUrl || null,
              role: role,
              externalId: user.externalId || null,
              metadata: JSON.stringify({
                publicMetadata: user.publicMetadata,
                privateMetadata: user.privateMetadata,
                unsafeMetadata: user.unsafeMetadata,
              }),
              lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
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