import { type User } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "~/server/db/schema";

// Create a proper Clerk client with the secret key
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function syncUser(clerkUser: User) {
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const firstName = clerkUser.firstName ?? "";
  const lastName = clerkUser.lastName ?? "";
  const username = clerkUser.username ?? "";

  // Get the role from Clerk's metadata
  const clerkRole = (clerkUser.publicMetadata?.role as string) || null;
  console.log(`Syncing user ${clerkUser.id} with role from Clerk: ${clerkRole || 'null'}`);

  const userData = {
    id: clerkUser.id,
    email,
    name: firstName && lastName ? `${firstName} ${lastName}` : username,
    imageUrl: clerkUser.imageUrl ?? "",
    updatedAt: new Date(),
  };

  try {
    // Try to find the user first
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, clerkUser.id),
    });

    if (existingUser) {
      // Update existing user, including role from Clerk if it exists
      const updateData = {
        ...userData,
        ...(clerkRole && { role: clerkRole as UserRole }),
      };
      
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, clerkUser.id))
        .returning();
      
      return updatedUser;
    } else {
      // Create new user with role from Clerk if it exists
      const insertData = {
        ...userData,
        role: clerkRole as UserRole | null, // Use role from Clerk or null
        createdAt: new Date(),
      };
      
      // If user is an organizer, set becameOrganizerAt
      if (clerkRole === "organizer") {
        insertData.becameOrganizerAt = new Date();
      }
      
      const [newUser] = await db
        .insert(users)
        .values(insertData)
        .returning();
      
      return newUser;
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}
