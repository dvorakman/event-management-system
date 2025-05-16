import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const { userId } = getAuth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to set a role" },
        { status: 401 }
      );
    }
    
    // Parse the role from the request body
    const { role } = await request.json();
    
    // Validate the role
    if (role !== "user" && role !== "organizer") {
      return NextResponse.json(
        { error: "Invalid role", message: "Role must be either 'user' or 'organizer'" },
        { status: 400 }
      );
    }
    
    // Update the user's metadata in Clerk
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role },
    });
    
    // If becoming an organizer, update the becameOrganizerAt field in our database
    if (role === "organizer") {
      await db
        .update(users)
        .set({
          role: "organizer",
          becameOrganizerAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // For regular users, just update the role
      await db
        .update(users)
        .set({ role: "user" })
        .where(eq(users.id, userId));
    }
    
    return NextResponse.json(
      { success: true, message: `Role set to ${role} successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to set role" },
      { status: 500 }
    );
  }
} 