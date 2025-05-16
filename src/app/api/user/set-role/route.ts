import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient, ClerkClient } from "@clerk/backend";

// Initialize Clerk client once
let clerk: ClerkClient | undefined;
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    console.log("Clerk client initialized successfully");
  } else {
    console.error("CLERK_SECRET_KEY is not defined in environment variables");
  }
} catch (error) {
  console.error("Failed to initialize Clerk client:", error);
}

export async function POST(request: NextRequest) {
  console.log("[set-role] POST request received");
  try {
    // Check if Clerk client was initialized
    if (!clerk) {
      console.error("[set-role] Clerk client not initialized");
      return NextResponse.json(
        { error: "Configuration Error", message: "Authentication service not properly configured" },
        { status: 500 }
      );
    }

    // Get the current user using the auth() function
    const authResult = await auth();
    const userId = authResult?.userId;
    console.log(`[set-role] Auth result:`, { userId });
    
    if (!userId) {
      console.error("[set-role] No user ID found in auth result");
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to set a role" },
        { status: 401 }
      );
    }
    
    // Parse the role and onboardingComplete from the request body
    let role;
    let onboardingComplete = false;
    try {
      const body = await request.json();
      role = body.role;
      // Get onboardingComplete flag if provided, default to true for backward compatibility
      onboardingComplete = body.onboardingComplete ?? true;
      console.log(`[set-role] Parsed data from request:`, { role, onboardingComplete });
    } catch (error) {
      console.error("[set-role] Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request", message: "Could not parse request body" },
        { status: 400 }
      );
    }
    
    // Validate the role
    if (role !== "user" && role !== "organizer") {
      console.error(`[set-role] Invalid role:`, { role });
      return NextResponse.json(
        { error: "Invalid role", message: "Role must be either 'user' or 'organizer'" },
        { status: 400 }
      );
    }
    
    // Update the user's metadata in Clerk - this is our single source of truth
    try {
      console.log(`[set-role] Updating Clerk metadata for user:`, { userId, role, onboardingComplete });
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          role,
          onboardingComplete
        },
      });
      console.log(`[set-role] Successfully updated Clerk metadata`);
    } catch (error) {
      console.error("[set-role] Error updating user metadata:", error);
      return NextResponse.json(
        { error: "Update Error", message: "Failed to update user metadata", details: String(error) },
        { status: 500 }
      );
    }
    
    // Return a successful response
    console.log(`[set-role] Role and onboarding status set successfully:`, { userId, role, onboardingComplete });
    return NextResponse.json(
      { 
        success: true, 
        message: `Role set to ${role} and onboarding ${onboardingComplete ? 'completed' : 'pending'}` 
      },
      { status: 200 }
    );
  } catch (error) {
    // Return a JSON error response
    console.error("[set-role] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to set role", details: String(error) },
      { status: 500 }
    );
  }
} 