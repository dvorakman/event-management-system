import Link from "next/link";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
import { ThemeToggle } from "~/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-950">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold">Event Management System</span>
          </Link>
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
                    href="/tickets"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  >
                    My Tickets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/notifications"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  >
                    Notifications
                  </Link>
                </li>
                <li>
                  <Link
                    href="/become-organizer"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  >
                    Become an Organizer
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
        </div>
        <div className="flex items-center gap-4">
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
        </div>
      </div>
    </header>
  );
}
