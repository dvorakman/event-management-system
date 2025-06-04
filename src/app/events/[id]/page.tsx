import { notFound } from "next/navigation";
import { Suspense } from "react";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { EventActionButtons } from "~/components/event/EventActionButtons";
import type { Metadata } from "next";

// Loading component for event details
function EventDetailsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

// Component to fetch and display event details
async function EventDetails({ id }: { id: number }) {
  const event = await api.event.byId({ id });

  if (!event) {
    notFound();
  }

  // Function to format dates for display
  const formatDate = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-gray-800 p-8 shadow-lg border border-gray-700">
          {/* Event Type Badge */}
          <div className="mb-4">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
              {event.type.replace('_', ' ')}
            </span>
          </div>

          {/* Event Title */}
          <h1 className="mb-6 text-4xl font-bold text-white">
            {event.name}
          </h1>

          {/* Event Details Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">
                Event Details
              </h2>
              <div className="space-y-3">
                <p className="text-gray-300">
                  <span className="font-medium text-white">Start:</span>{" "}
                  {formatDate(event.startDate)}
                </p>
                <p className="text-gray-300">
                  <span className="font-medium text-white">End:</span>{" "}
                  {formatDate(event.endDate)}
                </p>
                <p className="text-gray-300">
                  <span className="font-medium text-white">Location:</span> {event.location}
                </p>
                <p className="text-gray-300">
                  <span className="font-medium text-white">Status:</span>{" "}
                  <span
                    className={`capitalize ${
                      event.status === "published"
                        ? "text-green-400"
                        : event.status === "cancelled"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {event.status}
                  </span>
                </p>
                <p className="text-gray-300">
                  <span className="font-medium text-white">Max Attendees:</span> {event.maxAttendees}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">
                Ticket Information
              </h2>
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-700 p-4">
                  <h3 className="mb-2 font-semibold text-white">General Admission</h3>
                  <p className="text-2xl font-bold text-green-400">
                    ${Number(event.generalTicketPrice).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-700 p-4">
                  <h3 className="mb-2 font-semibold text-white">VIP Ticket</h3>
                  <p className="text-2xl font-bold text-purple-400 mb-2">
                    ${Number(event.vipTicketPrice).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-300">{event.vipPerks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Description */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Description</h2>
            <p className="text-gray-300 leading-relaxed">{event.description}</p>
          </div>

          {/* Action Buttons - Only show if event is published */}
          {event.status === "published" && (
            <div className="flex gap-4">
              <Suspense fallback={<Skeleton className="h-10 w-32" />}>
                <EventActionButtons eventId={event.id} />
              </Suspense>
            </div>
          )}

          {/* Status-specific messages */}
          {event.status === "cancelled" && (
            <div className="mt-6 rounded-lg bg-red-900 p-4 border border-red-700">
              <h3 className="font-semibold text-red-200">Event Cancelled</h3>
              <p className="text-red-300">
                This event has been cancelled. Please contact the organiser for more information.
              </p>
            </div>
          )}

          {event.status === "draft" && (
            <div className="mt-6 rounded-lg bg-yellow-900 p-4 border border-yellow-700">
              <h3 className="font-semibold text-yellow-200">Event in Draft</h3>
              <p className="text-yellow-300">
                This event is currently in draft mode and not yet available for registration.
              </p>
            </div>
          )}

          {event.status === "completed" && (
            <div className="mt-6 rounded-lg bg-gray-700 p-4 border border-gray-600">
              <h3 className="font-semibold text-gray-200">Event Completed</h3>
              <p className="text-gray-300">
                This event has already taken place.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EventPageProps {
  params: {
    id: string;
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const eventId = parseInt(params.id);

  if (isNaN(eventId)) {
    notFound();
  }

  return (
    <Suspense fallback={<EventDetailsLoading />}>
      <EventDetails id={eventId} />
    </Suspense>
  );
}

// Generate metadata for the page
export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const eventId = parseInt(params.id);
  
  if (isNaN(eventId)) {
    return {
      title: "Event Not Found",
    };
  }

  try {
    const event = await api.event.byId({ id: eventId });
    
    return {
      title: event ? `${event.name} | Event Management` : "Event Not Found",
      description: event?.description ?? "Event details",
    };
  } catch {
    return {
      title: "Event Not Found",
    };
  }
}
