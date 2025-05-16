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
  "/welcome",
  "/api/trpc"
];

const isPublicRoute = createRouteMatcher(
  publicRoutes.map((route) => (route === "/api/trpc" ? `${route}(.*)` : route)),
);

// Create route matchers for protected routes
const isOrganizerRoute = createRouteMatcher(["/organizer(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isWelcomePage = createRouteMatcher(["/welcome"]);

export default clerkMiddleware(async (auth, req) => {
  // If the route is not public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // For authenticated requests, enforce role-based access
  const { userId, sessionClaims } = await auth();
  
  if (userId) {
    // Check role from multiple possible locations
    // 1. Check directly in sessionClaims.role (if set in publicMetadata.role)
    // 2. Check in sessionClaims.publicMetadata.role
    // 3. Check in sessionClaims.metadata.role (older Clerk structure)
    const publicMetadata = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
    
    const roleFromSession = 
      (sessionClaims?.role as string | undefined) || 
      (publicMetadata?.role as string | undefined) || 
      (metadata?.role as string | undefined);
    
    // If user has no role and is not already on the welcome page, redirect to onboarding
    if (roleFromSession === null || roleFromSession === undefined) {
      if (!isWelcomePage(req) && !isPublicRoute(req)) {
        console.log(`User ${userId} has no role, redirecting to onboarding`);
        return NextResponse.redirect(new URL("/welcome", req.url));
      }
    } else {
      console.log(`User ${userId} has role: ${roleFromSession}`);
      
      // Handle organizer routes
      if (
        isOrganizerRoute(req) &&
        roleFromSession !== "organizer" &&
        roleFromSession !== "admin"
      ) {
        console.log(
          `Unauthorized access to organizer route by user with role ${roleFromSession}`,
        );
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Handle admin routes
      if (isAdminRoute(req) && roleFromSession !== "admin") {
        console.log(
          `Unauthorized access to admin route by user with role ${roleFromSession}`,
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
