import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware

// Create route matchers for protected routes
const isOrganizerRoute = createRouteMatcher(["/organizer(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware({
  // Handle auth before response
  beforeAuth: (req) => {
    // You can run code before Clerk authentication runs
    return NextResponse.next();
  },

  // Run code after authentication
  afterAuth: (auth, req) => {
    // Handle non-authenticated requests
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    // For authenticated requests, enforce role-based access
    if (auth.userId) {
      // Check route patterns for organizer/admin routes
      const path = req.nextUrl.pathname;

      // Check role from metadata
      const userRole = (auth.sessionClaims?.metadata?.role as string) || "user";

      // Handle organizer routes
      if (
        isOrganizerRoute(req) &&
        userRole !== "organizer" &&
        userRole !== "admin"
      ) {
        console.log(
          `Unauthorized access to organizer route by user with role ${userRole}`,
        );
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Handle admin routes
      if (isAdminRoute(req) && userRole !== "admin") {
        console.log(
          `Unauthorized access to admin route by user with role ${userRole}`,
        );
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|.*\\.(?:jpg|png|gif|svg|ico)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
