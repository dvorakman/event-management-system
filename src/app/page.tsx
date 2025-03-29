import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

import { api, HydrateClient } from "~/trpc/server";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
import { Globe } from "~/components/ui/globe";
import { BackgroundGradient } from "~/components/ui/background-gradient";
import { BackgroundBoxes } from "~/components/ui/background-boxes";

export default async function Home() {
  return (
    <HydrateClient>
      <div className="flex flex-col">
        {/* Hero Section with Globe */}
        <div className="relative min-h-[550px]">
          <BackgroundBoxes 
            className="fixed inset-0 z-0"
          />
          
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none">
            <div className="flex min-h-[550px] flex-col items-center justify-between gap-8 py-10 md:flex-row md:gap-12 md:py-20">
              {/* Text content */}
              <div className="flex flex-col justify-center space-y-6 text-center md:w-2/5 md:text-left pointer-events-auto">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                  Find and Manage Events
                </h1>
                <p className="max-w-2xl text-xl text-blue-100">
                  Discover exciting events or create and manage your own. Our
                  platform makes event management simple and enjoyable.
                </p>
                <div className="mt-8 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                  <Link href="/events" className="inline-block pointer-events-auto">
                    <InteractiveHoverButton
                      text="Browse Events"
                      className="w-auto bg-white text-blue-700 shadow-lg hover:bg-gray-100"
                    />
                  </Link>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <InteractiveHoverButton
                        type="button"
                        text="Sign Up to Organize"
                        className="w-auto bg-blue-500 text-white shadow-lg hover:bg-blue-400"
                      />
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/organizer/dashboard" className="inline-block">
                      <InteractiveHoverButton
                        text="Organizer Dashboard"
                        className="w-auto bg-blue-500 text-white shadow-lg hover:bg-blue-400"
                      />
                    </Link>
                  </SignedIn>
                </div>
              </div>

              {/* Globe component */}
              <div className="relative flex h-[400px] w-full md:absolute md:right-0 md:mr-4 md:h-[600px] md:w-[45%] lg:mr-5 pointer-events-auto">
                <div className="h-full w-full">
                  <Globe />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
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
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Featured Events
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* This would be mapped from actual events */}
              {[1, 2, 3].map((i) => (
                <BackgroundGradient key={i} containerClassName="rounded-lg">
                  <div className="flex flex-col overflow-hidden rounded-3xl shadow-lg">
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
                        <Link href={`/events/${i}`} className="inline-block">
                          <InteractiveHoverButton
                            text="View Details"
                            className="w-auto bg-blue-600 text-white hover:bg-blue-700"
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                </BackgroundGradient>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/events" className="inline-block">
                <InteractiveHoverButton
                  text="View All Events"
                  className="w-auto border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
                />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </HydrateClient>
  );
}
