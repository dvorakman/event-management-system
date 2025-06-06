"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect } from "react";

export function UserMenu() {
  useEffect(() => {
    // Add global error handler for Clerk sign out errors
    const handleClerkError = (event: ErrorEvent) => {
      const error = event.error;
      if (
        error?.message?.includes("requestAsyncStorage") ||
        error?.message?.includes("cookies()")
      ) {
        console.warn("Suppressing Clerk sign out error:", error.message);
        event.preventDefault();

        // Optionally, manually redirect to home page after sign out
        if (error.message.includes("signOut")) {
          setTimeout(() => {
            window.location.href = "/";
          }, 100);
        }
      }
    };

    // Add the error handler
    window.addEventListener("error", handleClerkError);

    // Also handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (
        error?.message?.includes("requestAsyncStorage") ||
        error?.message?.includes("cookies()")
      ) {
        console.warn("Suppressing Clerk promise rejection:", error.message);
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener("error", handleClerkError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonTrigger: {
              "&:focus": {
                boxShadow: "none",
              },
            },
          },
        }}
        userProfileUrl="/account"
      />
    </div>
  );
}
