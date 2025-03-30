import { type User } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

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

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, clerkUser.id))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          role: "user",
          createdAt: new Date(),
        })
        .returning();
      return newUser;
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
} 