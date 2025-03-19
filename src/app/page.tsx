import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-600 to-blue-800 py-20 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center space-y-6 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                Find and Manage Events
              </h1>
              <p className="max-w-2xl text-xl text-blue-100">
                Discover exciting events or create and manage your own. Our
                platform makes event management simple and enjoyable.
              </p>
              <div className="mt-8 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                <Link
                  href="/events"
                  className="rounded-md bg-white px-8 py-3 text-base font-medium text-blue-700 shadow-lg hover:bg-gray-100"
                >
                  Browse Events
                </Link>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="rounded-md bg-blue-500 px-8 py-3 text-base font-medium text-white shadow-lg hover:bg-blue-400"
                    >
                      Sign Up to Organize
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/organizer/dashboard"
                    className="rounded-md bg-blue-500 px-8 py-3 text-base font-medium text-white shadow-lg hover:bg-blue-400"
                  >
                    Organizer Dashboard
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              Why Choose Our Platform
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
                <h3 className="mb-3 text-xl font-semibold">
                  Easy Event Discovery
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Find events that match your interests with our powerful search
                  and filtering tools.
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
                <h3 className="mb-3 text-xl font-semibold">
                  Seamless Registration
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Register for events in seconds and receive digital tickets
                  instantly.
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
                <h3 className="mb-3 text-xl font-semibold">
                  Powerful Organizer Tools
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Create and manage events with ease, track registrations, and
                  communicate with attendees.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Events Section (would be dynamically populated in a real app) */}
        <section className="bg-gray-50 py-16 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              Featured Events
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* This would be mapped from actual events */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col overflow-hidden rounded-lg shadow-lg"
                >
                  <div className="h-48 bg-blue-200" />
                  <div className="flex flex-1 flex-col justify-between bg-white p-6 dark:bg-gray-800">
                    <div>
                      <p className="text-sm font-medium text-blue-600">
                        {i === 1
                          ? "Conference"
                          : i === 2
                            ? "Concert"
                            : "Workshop"}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                        Sample Event {i}
                      </h3>
                      <p className="mt-3 text-base text-gray-500 dark:text-gray-300">
                        This is a sample event description. In a real
                        application, this would show actual event details.
                      </p>
                    </div>
                    <div className="mt-6">
                      <Link
                        href={`/events/${i}`}
                        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/events"
                className="inline-block rounded-md border border-blue-600 px-6 py-3 text-base font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
              >
                View All Events
              </Link>
            </div>
          </div>
        </section>
      </div>
    </HydrateClient>
  );
}
