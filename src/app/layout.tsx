import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Inter } from "next/font/google";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "~/app/_components/Header";
import { Footer } from "~/components/ui/footer";
import { Toaster } from "~/components/ui/toaster";
import { ThemeProvider } from "~/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Event Management System",
  description: "Manage your events with ease",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

// Error boundary component for authentication errors
function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return children;
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} ${inter.variable}`}>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Global error handler for Clerk authentication errors
                window.addEventListener('error', function(event) {
                  const error = event.error;
                  if (error && (
                    error.message.includes('requestAsyncStorage') || 
                    error.message.includes('cookies()') ||
                    error.message.includes('invalidateCacheAction')
                  )) {
                    console.warn('Suppressing authentication error during sign out:', error.message);
                    event.preventDefault();
                    return false;
                  }
                });

                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  const error = event.reason;
                  if (error && (
                    error.message?.includes('requestAsyncStorage') || 
                    error.message?.includes('cookies()') ||
                    error.message?.includes('invalidateCacheAction')
                  )) {
                    console.warn('Suppressing authentication promise rejection:', error.message);
                    event.preventDefault();
                    return false;
                  }
                });
              `,
            }}
          />
        </head>
        <body
          className={`font-sans antialiased ${GeistSans.variable} ${inter.variable}`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TRPCReactProvider>
              <AuthErrorBoundary>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
              </AuthErrorBoundary>
            </TRPCReactProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
