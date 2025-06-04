/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { env } from "~/env";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Get auth info from headers directly
  const authHeader = opts.headers.get("authorization");
  console.log("[TRPC Context] Auth header:", {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? `${authHeader.substring(0, 15)}...` : null,
  });

  // Get auth session using Clerk's auth() helper
  const session = await auth();
  const userId = session.userId;

  console.log("[TRPC Context] Auth state:", {
    userId,
    hasHeaders: !!opts.headers,
    sessionId: session.sessionId,
  });

  // Extract user info from JWT claims
  const { sessionClaims } = session;
  let role = null;
  let onboardingComplete = false;
  
  if (sessionClaims) {
    // Extract role from JWT claims - first check direct role claim, then metadata
    role = sessionClaims.role as string | undefined;
    
    // If role is not found directly, check metadata
    if (!role && sessionClaims.metadata) {
      const metadata = sessionClaims.metadata as Record<string, unknown>;
      role = metadata.role as string | undefined;
    }
    
    // Extract onboardingComplete flag
    if (sessionClaims.metadata) {
      const metadata = sessionClaims.metadata as Record<string, unknown>;
      onboardingComplete = metadata.onboardingComplete as boolean || false;
    }
  }

  // If there's no userId, return minimal context
  if (!userId) {
    console.log("[TRPC Context] No userId found");
    return {
      db,
      headers: opts.headers,
      userRole: null,
      onboardingComplete: false,
    };
  }

  // Check if user exists in our database (for foreign key relationships only)
  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    // If user doesn't exist in our database yet, create a minimal entry for foreign key references
    if (!dbUser) {
      console.log("[TRPC Context] Creating minimal user entry for foreign key references");
      
      // Get user info from Clerk to satisfy not-null constraints
      const clerkUser = await currentUser();
      
      await db.insert(users).values({
        id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress || `${userId}@unknown.com`,
        name: clerkUser?.fullName || clerkUser?.firstName || clerkUser?.username || "Unknown User",
        imageUrl: clerkUser?.imageUrl,
        role: role as any || "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[TRPC Context] Database error:", error);
    // Non-fatal error, continue with context
  }

  // Return context with user info from Clerk
  return {
    db,
    userId,
    headers: opts.headers,
    userRole: role,
    onboardingComplete,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  const isDevelopment =
    !process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production";
  if (isDevelopment) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API that require
 * authentication. It guarantees that a user must be logged in to access the route.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    console.log("[TRPC Protected] Context:", {
      userId: ctx.userId,
      userRole: ctx.userRole,
      headers: Object.fromEntries(ctx.headers.entries()),
    });

    if (!ctx.userId) {
      console.log("[TRPC Protected] No userId found");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        // Pass userId and role info to the procedure
        userId: ctx.userId,
        userRole: ctx.userRole,
        onboardingComplete: ctx.onboardingComplete,
      },
    });
  });

/**
 * Organizer procedure
 * 
 * This procedure ensures the user has the organizer role
 */
export const organizerProcedure = protectedProcedure
  .use(async ({ ctx, next }) => {
    if (ctx.userRole !== "organizer" && ctx.userRole !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an organizer to access this resource",
      });
    }
    
    return next({ ctx });
  });

/**
 * Admin procedure
 * 
 * This procedure ensures the user has the admin role
 */
export const adminProcedure = protectedProcedure
  .use(async ({ ctx, next }) => {
    if (ctx.userRole !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an admin to access this resource",
      });
    }
    
    return next({ ctx });
  });
