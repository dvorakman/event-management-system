import { type User } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "~/server/db/schema";

// Create a Clerk client instance
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function syncUser(clerkUser: User) {
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const firstName = clerkUser.firstName ?? "";
  const lastName = clerkUser.lastName ?? "";
  const username = clerkUser.username ?? "";

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

    // Define the return type explicitly to avoid any type
    let dbUser: { id: string; role: UserRole } | undefined;

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, clerkUser.id))
        .returning();
      dbUser = updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          role: "user", // Default role for new users
          createdAt: new Date(),
        })
        .returning();
      dbUser = newUser;
    }

    // Sync the user's role to Clerk's publicMetadata
    if (dbUser) {
      // Only update if the role in Clerk metadata doesn't match our DB
      const clerkRole = (clerkUser.publicMetadata?.role as string) || "";
      if (clerkRole !== dbUser.role) {
        try {
          await clerk.users.updateUser(clerkUser.id, {
            publicMetadata: {
              ...clerkUser.publicMetadata,
              role: dbUser.role,
            },
          });
          console.log(`Updated Clerk metadata with role: ${dbUser.role}`);
        } catch (error) {
          console.error("Error updating Clerk metadata:", error);
        }
      }
    }

    return dbUser;
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}
