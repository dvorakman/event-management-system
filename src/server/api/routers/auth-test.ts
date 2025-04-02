import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const authTestRouter = createTRPCRouter({
  // Public procedure - should work without auth
  publicTest: publicProcedure.query(() => {
    return {
      message: "This is public - no auth required!",
      timestamp: new Date().toISOString(),
    };
  }),

  // Protected procedure - requires auth
  protectedTest: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is protected - auth required!",
      userId: ctx.userId,
      userEmail: ctx.dbUser?.email,
      timestamp: new Date().toISOString(),
    };
  }),

  // Protected procedure with user data
  getAuthStatus: protectedProcedure.query(({ ctx }) => {
    return {
      authenticated: true,
      userId: ctx.userId,
      user: ctx.dbUser ? {
        id: ctx.dbUser.id,
        email: ctx.dbUser.email,
        name: ctx.dbUser.name,
        createdAt: ctx.dbUser.createdAt,
      } : null,
    };
  }),
}); 