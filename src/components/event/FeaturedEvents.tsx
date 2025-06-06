"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { BackgroundGradient } from "~/components/ui/background-gradient";
import { Skeleton } from "~/components/ui/skeleton";
import Link from "next/link";

export function FeaturedEvents() {
  const {
    data: events,
    isLoading,
    error,
  } = api.event.getFeaturedEvents.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg">
            <Skeleton className="h-48 w-full" />
            <div className="space-y-3 p-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600">Failed to load featured events</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          No featured events available at the moment.
        </p>
        <Link href="/events">
          <Button variant="outline">Browse All Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <BackgroundGradient
          key={event.id}
          containerClassName="rounded-lg h-full"
        >
          <div className="flex h-full flex-col overflow-hidden rounded-3xl shadow-lg">
            <div className="flex h-48 flex-shrink-0 items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
              <div className="text-center text-white">
                <div className="text-lg font-semibold capitalize">
                  {event.type.replace("_", " ")}
                </div>
                <div className="text-sm opacity-90">
                  {event.registrationCount}/{event.maxAttendees} spots
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between bg-white p-6 dark:bg-gray-800">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium capitalize text-blue-600">
                    {event.type.replace("_", " ")}
                  </p>
                  {event.isSoldOut && (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                      Sold Out
                    </span>
                  )}
                  {!event.isSoldOut && event.availableSpots <= 10 && (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                      {event.availableSpots} left
                    </span>
                  )}
                </div>
                <h3 className="line-clamp-2 flex h-14 items-start text-xl font-semibold text-gray-900 dark:text-white">
                  <span>{event.name}</span>
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  📍 {event.location}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  📅{" "}
                  {new Date(event.startDate).toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="mt-3 line-clamp-2 flex h-12 items-start text-base text-gray-500 dark:text-gray-300">
                  <span>{event.description}</span>
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    From ${Number(event.generalTicketPrice).toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {event.registrationCount} attending
                  </span>
                </div>
              </div>
              <div className="mt-6 flex-shrink-0">
                <Link href={`/events/${event.id}`}>
                  <Button
                    className="w-full"
                    variant={
                      event.userRegistration
                        ? "secondary"
                        : event.isSoldOut
                          ? "default"
                          : "default"
                    }
                    disabled={
                      !!(
                        event.userRegistration &&
                        event.userRegistration.status !== "cancelled"
                      )
                    }
                  >
                    {event.userRegistration
                      ? event.userRegistration.status === "confirmed"
                        ? `Already Registered (${event.userRegistration.ticketType})`
                        : event.userRegistration.status === "pending"
                          ? "Registration Pending"
                          : event.userRegistration.status === "cancelled"
                            ? event.isSoldOut
                              ? "View Details"
                              : "Register Now"
                            : "Already Registered"
                      : event.isSoldOut
                        ? "View Details"
                        : "Register Now"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </BackgroundGradient>
      ))}
    </div>
  );
}
