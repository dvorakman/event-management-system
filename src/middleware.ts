import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/events", "/sign-in", "/sign-up", "/api/trpc"];
const isPublicRoute = createRouteMatcher(
  publicRoutes.map((route) => (route === "/api/trpc" ? `${route}(.*)` : route)),
);

export default clerkMiddleware(async (auth, req) => {
  // If the route is not public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // Don't run middleware on static files
    "/", // Run middleware on index page
    "/(api|trpc)(.*)",
  ], // Run middleware on API routes
};
