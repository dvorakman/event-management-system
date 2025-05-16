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
import { syncUser } from "~/server/auth/sync-user";
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

  // If there's no userId, return minimal context
  if (!userId) {
    console.log("[TRPC Context] No userId found");
    return {
      db,
      headers: opts.headers,
    };
  }

  // Get the current user from Clerk
  const clerkUser = await currentUser();
  console.log("[TRPC Context] Clerk user:", {
    id: clerkUser?.id,
    email: clerkUser?.emailAddresses?.[0]?.emailAddress,
  });

  if (!clerkUser) {
    console.log("[TRPC Context] No Clerk user found");
    return {
      db,
      userId,
      headers: opts.headers,
    };
  }

  try {
    // Always sync in development/preview, or if user doesn't exist in database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    console.log("[TRPC Context] DB user:", { id: dbUser?.id });

    const isDevelopment = !process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production";
    console.log("[TRPC Context] Environment:", {
      isDevelopment,
      VERCEL_ENV: process.env.VERCEL_ENV,
    });

    if (!dbUser || isDevelopment) {
      console.log("[TRPC Context] Syncing user from Clerk");
      const syncedUser = await syncUser(clerkUser);
      return {
        db,
        userId,
        dbUser: syncedUser,
        headers: opts.headers,
      };
    }

    return {
      db,
      userId,
      dbUser,
      headers: opts.headers,
    };
  } catch (error) {
    console.error("[TRPC Context] Database error:", error);
    // Return basic context if database operations fail
    return {
      db,
      userId,
      headers: opts.headers,
    };
  }
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
      hasDbUser: !!ctx.dbUser,
      headers: Object.fromEntries(ctx.headers.entries()),
    });

    if (!ctx.userId) {
      console.log("[TRPC Protected] No userId found");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    // Get current user to access JWT claims
    const session = await auth();
    const { sessionClaims } = session;
    
    // Extract role from JWT claims - first check direct role claim, then metadata
    let role = sessionClaims?.role as string | undefined;
    
    // If role is not found directly, check metadata
    if (!role && sessionClaims?.metadata) {
      const metadata = sessionClaims.metadata as Record<string, unknown>;
      role = metadata.role as string | undefined;
    }
    
    // Also extract onboardingComplete flag
    let onboardingComplete = false;
    if (sessionClaims?.metadata) {
      const metadata = sessionClaims.metadata as Record<string, unknown>;
      onboardingComplete = metadata.onboardingComplete as boolean || false;
    }
    
    console.log("[TRPC Protected] User info from JWT:", { 
      role, 
      onboardingComplete,
      hasMetadata: !!sessionClaims?.metadata
    });

    return next({
      ctx: {
        ...ctx,
        // Ensure these are available in the procedure
        userId: ctx.userId,
        // Pass database user for non-role data
        dbUser: ctx.dbUser || null,
        // Add role and onboarding status from JWT to the context
        userRole: role || null,
        onboardingComplete,
      },
    });
  });
