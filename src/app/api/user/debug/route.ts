import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    // Get basic environment information
    const envVars = {
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      hasClerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      nodeEnv: process.env.NODE_ENV,
    };

    // Get auth state
    let authState = { userId: null, sessionId: null, isAuthenticated: false };
    
    try {
      const { userId, sessionId } = await auth();
      if (userId) {
        authState = {
          userId,
          sessionId,
          isAuthenticated: true
        };
      }
    } catch (error) {
      // Auth error is handled by returning the default authState
    }

    return NextResponse.json({
      success: true,
      environment: envVars,
      auth: authState,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error("Debug API error:", error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }
} 