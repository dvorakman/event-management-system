import Link from "next/link";
import Image from "next/image";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
import { ThemeToggle } from "~/components/theme-toggle";
import { Skeleton } from "~/components/ui/skeleton";

export function Header({ isLoading }: { isLoading?: boolean }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-950">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <Link href="/" className="flex items-center">
              <Image
                src="/gatherhub_logo.png"
                alt="Gather Hub Logo"
                width={120}
                height={30}
                className="h-auto"
              />
            </Link>
          )}
          {isLoading ? (
            <nav className="hidden md:flex">
              <ul className="flex space-x-4">
                <li>
                  <Skeleton className="h-5 w-24" />
                </li>
                <li>
                  <Skeleton className="h-5 w-20" />
                </li>
                <li>
                  <Skeleton className="h-5 w-28" />
                </li>
                <li>
                  <Skeleton className="h-5 w-32" />
                </li>
              </ul>
            </nav>
          ) : (
            <nav className="hidden md:flex">
              <ul className="flex space-x-4">
                <li>
                  <Link
                    href="/events"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  >
                    Browse Events
                  </Link>
                </li>
                <SignedIn>
                  <li>
                    <Link
                      href="/dashboard?tab=tickets"
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                    >
                      My Tickets
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard?tab=notifications"
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                    >
                      Notifications
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                    >
                      Dashboard
                    </Link>
                  </li>
                </SignedIn>
              </ul>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </>
          ) : (
            <>
              <ThemeToggle />
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <div className="inline-block">
                    <InteractiveHoverButton
                      type="button"
                      text="Sign In"
                      className="w-auto bg-blue-600 text-white hover:bg-blue-700"
                    />
                  </div>
                </SignInButton>
              </SignedOut>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
