"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { BackgroundGradient } from "~/components/ui/background-gradient";
import { Skeleton } from "~/components/ui/skeleton";
import Link from "next/link";

export function FeaturedEvents() {
  const { data: events, isLoading, error } = api.event.getFeaturedEvents.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-6 space-y-3">
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
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load featured events</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          No featured events available at the moment.
        </p>
        <Link href="/events">
          <Button variant="outline">Browse All Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <BackgroundGradient key={event.id} containerClassName="rounded-lg">
          <div className="flex flex-col overflow-hidden rounded-3xl shadow-lg">
            <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-lg font-semibold capitalize">
                  {event.type.replace('_', ' ')}
                </div>
                <div className="text-sm opacity-90">
                  {event.registrationCount}/{event.maxAttendees} spots
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between bg-white p-6 dark:bg-gray-800">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-600 capitalize">
                    {event.type.replace('_', ' ')}
                  </p>
                  {event.isSoldOut && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      Sold Out
                    </span>
                  )}
                  {!event.isSoldOut && event.availableSpots <= 10 && (
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      {event.availableSpots} left
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {event.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  📍 {event.location}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  📅 {new Date(event.startDate).toLocaleDateString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
                <p className="mt-3 text-base text-gray-500 dark:text-gray-300 line-clamp-2">
                  {event.description}
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
              <div className="mt-6">
                <Link href={`/events/${event.id}`}>
                  <Button className="w-full">
                    {event.isSoldOut ? "View Details" : "Register Now"}
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