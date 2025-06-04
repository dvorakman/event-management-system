"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: stats, isLoading } = api.event.getOrganizerStats.useQuery();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        <Button asChild>
          <Link href="/organizer/events/new">Create New Event</Link>
        </Button>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">My Events</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card
                    key={i}
                    className="flex items-center justify-center p-6"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.totalEvents || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Tickets Sold
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.totalRegistrations || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${stats?.totalRevenue?.toFixed(2) || "0.00"}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats?.recentRegistrations?.length ? (
                <div className="space-y-2">
                  {stats.recentRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{reg.eventName}</p>
                        <p className="text-sm text-muted-foreground">
                          {reg.ticketType} ticket - ${reg.amount}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reg.date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  No recent registrations
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <div className="mb-4 flex justify-end">
            <Button asChild variant="outline">
              <Link href="/organizer/events/new">Create New Event</Link>
            </Button>
          </div>
          <EventsList />
        </TabsContent>

        <TabsContent value="attendees">
          <AttendeesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventsList() {
  const { data: events, isLoading } = api.event.getOrganizerEvents.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!events?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="mb-4 text-lg font-medium">No events found</p>
        <p className="mb-6 text-muted-foreground">
          You haven't created any events yet. Create your first event to get
          started.
        </p>
        <Button asChild>
          <Link href="/organizer/events/new">Create Event</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <div className="bg-muted p-0">
            <div className="h-32 bg-blue-100" />
          </div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="line-clamp-1">{event.name}</CardTitle>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  event.status === "published"
                    ? "bg-green-100 text-green-800"
                    : event.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {event.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {event.description}
            </p>
            <p className="text-sm">
              <span className="font-medium">Date:</span>{" "}
              {new Date(event.startDate).toLocaleDateString()}
            </p>
            <p className="text-sm">
              <span className="font-medium">Sales:</span>{" "}
              {event.registrations || 0} tickets
            </p>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" asChild>
                <Link href={`/organizer/events/${event.id}`}>Manage</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/events/${event.id}`}>View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendeesList() {
  const { data: attendees, isLoading } =
    api.event.getOrganizerAttendees.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!attendees?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="mb-4 text-lg font-medium">No attendees found</p>
        <p className="text-muted-foreground">
          There are no registrations for your events yet.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Attendees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {attendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{attendee.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {attendee.eventName} - {attendee.ticketType} ticket
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    attendee.status === "confirmed"
                      ? "bg-green-100 text-green-800"
                      : attendee.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {attendee.status}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/organizer/attendees/${attendee.id}`}>
                    Details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
