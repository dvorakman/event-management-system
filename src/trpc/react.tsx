"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";
import { useAuth } from "@clerk/nextjs";

import { type AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>({
  // Override this method to add a callback for when mutations are created
  createContext: (opts) => {
    const originalCreateMutation = opts.createMutation;

    opts.createMutation = (props) => {
      // Log which mutations are being created and where
      const procedurePath = Array.isArray(props.path)
        ? props.path.join(".")
        : props.path;

      // Only log the payment verification mutation to avoid noise
      if (procedurePath === "event.verifyPaymentAndCreateTicket") {
        console.log(`[TRPC] Creating mutation: ${procedurePath}`, {
          url:
            typeof window !== "undefined" ? window.location.pathname : "server",
        });
      }

      return originalCreateMutation(props);
    };

    return opts;
  },
});

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { getToken, isLoaded, userId } = useAuth();

  console.log("[TRPCProvider] Auth state:", { isLoaded, userId });

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) => {
            // Log all operations during development
            if (process.env.NODE_ENV === "development") {
              // Only log specific operations to reduce noise
              if (op.path === "event.verifyPaymentAndCreateTicket") {
                console.log(`[TRPC] Operation ${op.direction} - ${op.path}`, {
                  type: op.type,
                  context: op.context,
                  path: op.path,
                });
              }
              return true;
            }
            // Always log errors
            return op.direction === "down" && op.result instanceof Error;
          },
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: async () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");

            try {
              const token = await getToken();
              console.log("[TRPCProvider] Got token:", !!token);
              if (token) {
                headers.set("Authorization", `Bearer ${token}`);
              }
            } catch (error) {
              console.error("[TRPCProvider] Failed to get auth token:", error);
            }

            return headers;
          },
          fetch: (url, options) => {
            console.log("[TRPCProvider] Fetching:", {
              url,
              hasAuth:
                options?.headers &&
                "Authorization" in
                  Object.fromEntries(new Headers(options.headers).entries()),
              path:
                typeof window !== "undefined" ? window.location.pathname : null,
            });
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
