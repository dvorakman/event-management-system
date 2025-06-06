import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";

import { createCaller, type AppRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  try {
    const heads = new Headers(await headers());
    heads.set("x-trpc-source", "rsc");

    return createTRPCContext({
      headers: heads,
    });
  } catch (error) {
    // Check if this is the specific requestAsyncStorage error
    const errorMessage = String(error);
    if (errorMessage.includes("requestAsyncStorage") || errorMessage.includes("cookies()")) {
      console.warn("[TRPC Server] RequestAsyncStorage not available - likely during sign out or SSR:", errorMessage);
    } else {
      console.warn("[TRPC Server] Failed to get headers:", error);
    }
    
    // Fallback to empty headers if requestAsyncStorage is not available
    const fallbackHeaders = new Headers();
    fallbackHeaders.set("x-trpc-source", "rsc");
    
    return createTRPCContext({
      headers: fallbackHeaders,
    });
  }
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient
);
