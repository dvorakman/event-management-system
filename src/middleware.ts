import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
const isDebugRoute = createRouteMatcher(["/api/user/debug", "/api/user/set-role"]);

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
  const { userId, sessionClaims } = await auth();
  
  if (userId) {
    // Get user role and onboarding status from session claims
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
    }
    
    // Check if user needs to complete onboarding
    if ((!role || !onboardingComplete) && !isOnboardingPage(req) && !isDebugRoute(req)) {
      // Redirect to onboarding if user hasn't completed it
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    
    // Handle organizer routes
    if (
      isOrganizerRoute(req) &&
      role !== "organizer" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Handle admin routes
    if (isAdminRoute(req) && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
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
