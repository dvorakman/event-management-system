import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { syncUser } from "~/server/auth/sync-user";

export async function GET(request: Request) {
  try {
    // Log the headers received from the client
    const headers = Object.fromEntries(new Headers(request.headers).entries());
    console.log("[API /user/current] Request headers:", {
      'x-clerk-auth-status': headers['x-clerk-auth-status'],
      'x-clerk-auth-token': headers['x-clerk-auth-token'] ? 'present' : 'missing',
      'cookie': headers['cookie'] ? 'present' : 'missing',
    });

    // Get auth info and log it
    const { userId } = auth();
    console.log("[API /user/current] Auth state:", { userId });

    if (!userId) {
      // If no userId, try accessing auth token directly from headers
      const authToken = headers['x-clerk-auth-token'];
      if (authToken) {
        console.log("[API /user/current] Found auth token in headers, but auth() didn't return userId");
      }
      
      console.log("[API /user/current] No userId found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Clerk user
    const clerkUser = await currentUser();
    console.log("[API /user/current] Clerk user:", { 
      id: clerkUser?.id,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress 
    });

    if (!clerkUser) {
      console.log("[API /user/current] No Clerk user found");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get or create DB user
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    console.log("[API /user/current] DB user:", { id: dbUser?.id });

    // If no DB user, sync from Clerk
    if (!dbUser) {
      console.log("[API /user/current] Syncing user");
      dbUser = await syncUser(clerkUser);
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("[API /user/current] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 