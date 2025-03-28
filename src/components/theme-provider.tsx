"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Define the Attribute type from next-themes
type Attribute = "class" | "data-theme" | "data-mode";

// Define the ThemeProviderProps interface locally instead of importing from next-themes/dist/types
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  attribute?: Attribute | Attribute[];
  value?: Record<string, string>;
  forcedTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  themes?: string[];
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
