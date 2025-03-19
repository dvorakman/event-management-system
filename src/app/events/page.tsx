import Link from "next/link";
import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";

// Loading component shown during event data fetch
function EventsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Events</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse flex-col rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
          >
            <div className="mb-4 h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="mb-2 h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="mb-4 h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="mt-auto h-10 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component to fetch and display events
async function EventsList() {
  // Fetch events from API
  const eventsData = await api.event.list.query();

  // If no events are found
  if (eventsData.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Events</h1>
        <div className="rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
          <h2 className="text-xl font-semibold">No events found</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Check back later for upcoming events.
          </p>
        </div>
      </div>
    );
  }

  // Function to format dates for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Events</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {eventsData.items.map((event) => (
          <div
            key={event.id}
            className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:-translate-y-1 dark:bg-gray-800"
          >
            <div className="mb-2 text-sm font-medium uppercase text-blue-600 dark:text-blue-400">
              {event.type}
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {event.name}
            </h2>
            <p className="mb-4 line-clamp-3 flex-grow text-gray-600 dark:text-gray-400">
              {event.description}
            </p>
            <div className="mb-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <span className="mr-1 font-medium">When:</span>
                {formatDate(event.startDate)}
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <span className="mr-1 font-medium">Where:</span>
                {event.location}
              </div>
            </div>
            <div className="mt-auto">
              <Link
                href={`/events/${event.id}`}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {eventsData.nextCursor && (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/events?cursor=${eventsData.nextCursor}`}
            className="rounded-md border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
          >
            Load More
          </Link>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <HydrateClient>
      <Suspense fallback={<EventsLoading />}>
        <EventsList />
      </Suspense>
    </HydrateClient>
  );
}
