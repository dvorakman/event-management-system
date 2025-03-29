"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

interface InteractiveHoverButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function InteractiveHoverButton({
  text,
  isLoading = false,
  loadingText = "Loading...",
  className,
  disabled,
  ...props
}: InteractiveHoverButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      <span
        className={cn(
          "absolute inset-0 flex h-full w-full -translate-x-full items-center justify-center bg-white/10 transition-transform duration-300 group-hover:translate-x-0",
          isLoading ? "translate-x-0" : "",
        )}
      />
      <span className="relative flex items-center gap-2">
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isLoading ? loadingText : text}
      </span>
    </button>
  );
}
