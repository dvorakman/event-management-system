import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { syncUser } from "~/server/auth/sync-user";

export async function GET(request: Request) {
  try {
    // Get auth info
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to access this resource" },
        { status: 401 }
      );
    }

    // Get Clerk user
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found", message: "Could not retrieve user information" },
        { status: 404 }
      );
    }

    // Get or create DB user
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // If no DB user, sync from Clerk
    if (!dbUser) {
      dbUser = await syncUser(clerkUser);
    }

    return NextResponse.json({ 
      success: true,
      user: dbUser 
    });
  } catch (error) {
    console.error("[API /user/current] Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        message: "Something went wrong while retrieving user data" 
      },
      { status: 500 }
    );
  }
} 