"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { RouterOutputs } from "~/trpc/shared";

type Stats = RouterOutputs["event"]["getOrganizerStats"];
type Registration = Stats["recentRegistrations"][number];
type Event = RouterOutputs["event"]["getOrganizerEvents"][number];
type Attendee = RouterOutputs["event"]["getOrganizerAttendees"][number];

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: stats, isLoading } = api.event.getOrganizerStats.useQuery({});

  // Prepare chart data
  const monthlyRevenue = stats?.monthlyRevenue ?? [];
  const ticketDistribution = [
    { type: "General", count: stats?.ticketDistribution?.general ?? 0 },
    { type: "VIP", count: stats?.ticketDistribution?.vip ?? 0 },
  ];

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
          <div className="grid gap-4 md:grid-cols-4">
            {/* Stats Cards */}
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
                <div className="mt-1 text-xs text-muted-foreground">
                  {stats?.publishedEvents ?? 0} published events
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Registrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalRegistrations || 0}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Across all your events
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
                  ${Number(stats?.totalRevenue ?? 0).toFixed(2)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  From confirmed registrations
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Ticket Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={40}>
                  <BarChart
                    data={ticketDistribution}
                    layout="vertical"
                    margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="type" hide />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex justify-between text-xs">
                  <span>General</span>
                  <span>{ticketDistribution?.[0]?.count ?? 0}</span>
                  <span>VIP</span>
                  <span>{ticketDistribution?.[1]?.count ?? 0}</span>
                </div>
                {ticketDistribution[0].count === 0 &&
                  ticketDistribution[1].count === 0 && (
                    <div className="mt-2 text-center text-muted-foreground">
                      No ticket sales yet
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Last 6 months of revenue
                </div>
              </CardHeader>
              <CardContent style={{ height: 220 }}>
                {monthlyRevenue.length > 0 &&
                monthlyRevenue.some((m) => m.revenue > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyRevenue}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No revenue data
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Your next scheduled events
                </div>
              </CardHeader>
              <CardContent>
                {/* Placeholder for upcoming events */}
                <div className="text-muted-foreground">No upcoming events</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <div className="text-xs text-muted-foreground">
                Recent event and ticket activity
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats?.recentRegistrations?.length ? (
                <div className="space-y-2">
                  {stats.recentRegistrations.map((reg: Registration) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{reg.eventName}</p>
                        <p className="text-sm text-muted-foreground">
                          {reg.ticketType} ticket - ${Number(reg.amount).toFixed(2)}
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
              <span>
                <Link href="/organizer/events/new">Create New Event</Link>
              </span>
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
  const { data: events, isLoading } = api.event.getOrganizerEvents.useQuery({});

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
      {events.map((event: Event) => (
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
                <span>
                  <Link href={`/organizer/events/${event.id}`}>Manage</Link>
                </span>
              </Button>
              <Button variant="outline" asChild>
                <span>
                  <Link href={`/events/${event.id}`}>View</Link>
                </span>
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
    api.event.getOrganizerAttendees.useQuery({});

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
          {attendees.map((attendee: Attendee) => (
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
                  <span>
                    <Link href={`/organizer/attendees/${attendee.id}`}>
                      Details
                    </Link>
                  </span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
