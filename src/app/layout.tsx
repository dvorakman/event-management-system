import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";
import { Header } from "./_components/Header";

export const metadata: Metadata = {
  title: "Event Management System",
  description: "A system for managing events, registrations, and attendees",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ClerkProvider>
          <TRPCReactProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
