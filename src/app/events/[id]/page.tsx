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
async function EventDetails({ id }: { id: string }) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        {/* Event Type Badge */}
        <div className="mb-4">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {event.type}
          </span>
        </div>

        {/* Event Title */}
        <h1 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
          {event.name}
        </h1>

        {/* Event Details Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Event Details
            </h2>
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Start:</span>{" "}
                {formatDate(event.startDate)}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">End:</span>{" "}
                {formatDate(event.endDate)}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Location:</span> {event.location}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`capitalize ${
                    event.status === "published"
                      ? "text-green-600"
                      : event.status === "cancelled"
                        ? "text-red-600"
                        : "text-yellow-600"
                  }`}
                >
                  {event.status}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Ticket Information
            </h2>
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">General Admission:</span> $
                {event.generalTicketPrice.toString()}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">VIP Ticket:</span> $
                {event.vipTicketPrice.toString()}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">VIP Perks:</span> {event.vipPerks}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Maximum Attendees:</span>{" "}
                {event.maxAttendees}
              </p>
            </div>
          </div>
        </div>

        {/* Event Description */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300">
            {event.description}
          </p>
        </div>

        {/* Action Buttons */}
        <EventActionButtons
          status={event.status}
          eventId={event.id}
          eventName={event.name}
          generalPrice={event.generalTicketPrice}
          vipPrice={event.vipTicketPrice}
          vipPerks={event.vipPerks}
        />
      </div>
    </div>
  );
}

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function EventPage({ params }: Props) {
  return (
    <Suspense fallback={<EventDetailsLoading />}>
      <EventDetails id={params.id} />
    </Suspense>
  );
}
