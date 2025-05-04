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
  "/api/trpc"
];

const isPublicRoute = createRouteMatcher(
  publicRoutes.map((route) => (route === "/api/trpc" ? `${route}(.*)` : route)),
);

// Create route matchers for protected routes
const isOrganizerRoute = createRouteMatcher(["/organizer(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // If the route is not public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // For authenticated requests, enforce role-based access
  const { userId, sessionClaims } = await auth();
  
  if (userId) {
    // Check role from metadata
    // Use optional chaining and type assertion to safely access the role
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
    const userRole = (metadata?.role as string) || "user";

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
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|.*\\.(?:jpg|png|gif|svg|ico)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
