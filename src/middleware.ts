import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";
const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

// Define middleware function
export default function middleware(req: NextRequest) {
  // For development, allow bypassing auth with mock data
  if (isDevelopment && useMockAuth) {
    console.log("Using mock authentication in development mode");
    // Allow full access in development mode when using mock auth
    return NextResponse.next();
  }
  
  // Otherwise, use the Clerk middleware
  return clerkMiddleware({
    publicRoutes: [
      "/",
      "/sign-in*",
      "/sign-up*",
      "/api/webhook/clerk",
      "/api/webhook/stripe",
      "/events",
      "/events/(.*)",
    ],
    
    afterAuth(auth, req) {
      // Handle unauthorized access
      if (!auth.userId && !auth.isPublicRoute) {
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }
      
      // Check for organizer routes
      const isOrganizerRoute = req.nextUrl.pathname.startsWith('/organizer');
      const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
      
      // Skip role checks if not accessing restricted routes
      if (!isOrganizerRoute && !isAdminRoute) {
        return NextResponse.next();
      }
      
      // Get user role from auth session
      const userRole = (auth.sessionClaims?.metadata?.role as string) || "user";
      
      // Restrict organizer routes to organizers and admins
      if (isOrganizerRoute && userRole !== "organizer" && userRole !== "admin") {
        console.log(`Unauthorized access to organizer route by user with role ${userRole}`);
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // Restrict admin routes to admins only
      if (isAdminRoute && userRole !== "admin") {
        console.log(`Unauthorized access to admin route by user with role ${userRole}`);
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      return NextResponse.next();
    },
  })(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|.*\\.(?:jpg|png|gif|svg|ico)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
