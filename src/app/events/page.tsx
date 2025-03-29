import { Suspense } from "react";
import Link from "next/link";
import { EventFilters } from "~/components/events/EventFilters";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

function EventsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );
}

async function EventsList({
  searchParams,
}: {
  searchParams: {
    type?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
  };
}) {
  const caller = createCaller(await createTRPCContext({ headers: new Headers() }));
  
  const events = await caller.event.list({
    type: searchParams.type,
    location: searchParams.location,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    searchTerm: searchParams.search,
    limit: 10,
    offset: 0,
  });

  if (!events.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          No events found matching your criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all hover:shadow-lg dark:bg-gray-800"
        >
          {/* Event Image */}
          <div className="relative h-48 w-full overflow-hidden">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
                <span className="text-gray-400">No image</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <span className="inline-block rounded-full bg-blue-500 px-3 py-1 text-sm text-white">
                {event.type}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="p-4">
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              {event.name}
            </h3>
            <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
              {event.description}
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {new Date(event.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>•</span>
              <span>{event.location}</span>
              <span>•</span>
              <span>${event.ticketPrice}</span>
            </div>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={`/events/${event.id}`}
              className="rounded-lg bg-white px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-100"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventsPage({
  searchParams,
}: {
  searchParams: {
    type?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
  };
}) {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Events
      </h1>
      
      <div className="mb-8">
        <EventFilters />
      </div>

      <Suspense fallback={<EventsLoading />}>
        <EventsList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
