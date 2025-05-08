import { clerkClient } from '@clerk/nextjs/server';
import type { OrganizationMembershipResource, UserResource } from '@clerk/types';

const DEV_ORG_ID = "org_2uhiVWqO42Gg9QpwFMtarlywYwA";

// Initialize the Clerk client
const clerk = clerkClient;

async function testOrgMembership() {
  console.log("Testing organization membership...");
  console.log("Using Clerk Secret Key:", process.env.CLERK_SECRET_KEY?.slice(0, 8) + "...");
  
  try {
    // Get all users
    const users = await clerk.users.getUserList();
    console.log(`Found ${users.length} users in Clerk`);

    for (const user of users) {
      console.log("\n----------------------------------------");
      console.log(`Testing user: ${user.username} (${user.emailAddresses[0]?.emailAddress})`);
      
      // Get org memberships for this user
      const memberships = await clerk.users.getOrganizationMembershipList({
        userId: user.id
      });

      console.log(`Found ${memberships.length} organization memberships`);
      
      // Check if user is in dev org
      const devOrgMembership = memberships.find((m: OrganizationMembershipResource) => 
        m.organization.id === DEV_ORG_ID
      );
      
      if (devOrgMembership) {
        console.log("✅ User is in dev organization");
        console.log("Role:", devOrgMembership.role);
      } else {
        console.log("❌ User is not in dev organization");
      }

      // List all organizations this user belongs to
      console.log("\nAll organization memberships:");
      memberships.forEach((m: OrganizationMembershipResource) => {
        console.log(`- ${m.organization.name} (${m.organization.id})`);
        console.log(`  Role: ${m.role}`);
      });
    }

  } catch (error) {
    console.error("Error testing organization membership:", error);
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url.endsWith('test-org-membership.ts')) {
  console.log("Running organization membership test...");
  testOrgMembership()
    .then(() => console.log("Test completed"))
    .catch(console.error);
}

export { testOrgMembership }; 