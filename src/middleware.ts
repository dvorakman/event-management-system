import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/backend";

// Create Clerk client for direct API access (used only as fallback for JWT sync issues)
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/events",
  "/events/:id",
  "/events/:id/register",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/api/trpc",
  "/api/user/debug",
  "/api/user/set-role"
];

const isPublicRoute = createRouteMatcher(
  publicRoutes.map((route) => (route === "/api/trpc" ? `${route}(.*)` : route)),
);

// Create route matchers for protected routes
const isOrganizerRoute = createRouteMatcher(["/organizer(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isOnboardingPage = createRouteMatcher(["/onboarding"]);
const isHomePage = createRouteMatcher(["/"]);
const isDebugRoute = createRouteMatcher(["/api/user/debug", "/api/user/set-role"]);

// Cache JWTs that are being processed to prevent multiple Clerk API calls
// This helps with the token synchronization delay issue
const jwtSyncCache = new Map<string, { timestamp: number, metadata: Record<string, unknown> }>();
const JWT_CACHE_TTL = 60 * 1000; // 60 seconds

export default clerkMiddleware(async (auth, req) => {
  // Skip all checks for debug route
  if (isDebugRoute(req)) {
    return NextResponse.next();
  }

  // If the route is not public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // For authenticated requests, enforce role-based access
  const { userId, sessionClaims, session } = await auth();
  
  if (userId) {
    // Get user role and onboarding status from session claims - first check direct role claim
    let role = sessionClaims?.role as string | undefined;
    let onboardingComplete = false;
    
    // If metadata is available in session claims, use it
    if (sessionClaims?.metadata) {
      const metadata = sessionClaims.metadata as Record<string, unknown>;
      
      // Only override role if it's not already set from direct claim
      if (!role) {
        role = metadata.role as string | undefined;
      }
      
      onboardingComplete = metadata.onboardingComplete as boolean || false;
      console.log(`User ${userId} metadata from JWT:`, { role, onboardingComplete });
    }
    
    // Check if user needs to complete onboarding
    if ((!role || !onboardingComplete) && !isOnboardingPage(req) && !isDebugRoute(req)) {
      // Check if we have a recent cache entry for this user
      const cacheEntry = jwtSyncCache.get(userId);
      const currentTime = Date.now();
      
      // If cache entry exists and is fresh
      if (cacheEntry && (currentTime - cacheEntry.timestamp) < JWT_CACHE_TTL) {
        // Check if cached metadata indicates onboarding is complete
        if (cacheEntry.metadata.role && cacheEntry.metadata.onboardingComplete) {
          console.log(`[JWT Cache] Found valid cached metadata for ${userId}`);
          return NextResponse.next();
        }
      }
      
      // Before redirecting, check Clerk directly (only if JWT seems stale)
      try {
        // Get latest user data directly from Clerk API
        const userFromClerk = await clerkClient.users.getUser(userId);
        const clerkMetadata = userFromClerk.publicMetadata as Record<string, unknown>;
        
        // Cache the result to avoid repeated API calls
        jwtSyncCache.set(userId, {
          timestamp: currentTime,
          metadata: clerkMetadata
        });
        
        // If Clerk has the role and onboarding complete, allow access
        if (clerkMetadata.role && clerkMetadata.onboardingComplete) {
          console.log(`User ${userId} has completed onboarding in Clerk but JWT not updated yet`);
          return NextResponse.next();
        }
        
        // Otherwise redirect to onboarding
        console.log(`User ${userId} needs to complete onboarding, redirecting`);
        return NextResponse.redirect(new URL("/onboarding", req.url));
      } catch (error) {
        console.error(`Error checking user data from Clerk:`, error);
        // Fall back to redirecting to onboarding on error
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    } else {
      console.log(`User ${userId} has role: ${role}`);
      
      // Handle organizer routes
      if (
        isOrganizerRoute(req) &&
        role !== "organizer" &&
        role !== "admin"
      ) {
        console.log(
          `Unauthorized access to organizer route by user with role ${role}`,
        );
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Handle admin routes
      if (isAdminRoute(req) && role !== "admin") {
        console.log(
          `Unauthorized access to admin route by user with role ${role}`,
        );
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|.*\\.(?:jpg|png|gif|svg|ico)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
