"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Loader2,
  Download,
  Calendar,
  Users,
  ChevronRight,
  DollarSign,
  BarChart2,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { mockDashboardService } from "~/lib/mock-services";

// Constants
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const USE_MOCK_DATA = true; // Set to false when ready to use real data

// Type definitions
type TicketType = "general" | "vip";
type EventStatus = "published" | "draft" | "cancelled" | "completed";
type AttendeeStatus = "confirmed" | "pending" | "cancelled" | "refunded";
type PaymentStatus = "completed" | "pending" | "failed" | "refunded";

interface Attendee {
  id: number;
  userId: string;
  userName: string;
  eventId: number;
  eventName: string;
  ticketType: TicketType;
  status: AttendeeStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  createdAt: Date;
}

interface Event {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  type: string;
  generalTicketPrice: number;
  vipTicketPrice: number;
  maxAttendees: number;
  status: EventStatus;
  createdAt: Date;
  registrations: number;
}

// Create a mock service interface that mirrors the expected API structure
interface DashboardData {
  totalEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  recentRegistrations: {
    id: number;
    eventId: number;
    eventName: string;
    actionType: string;
    description: string;
    ticketType?: TicketType;
    amount?: number;
    date: Date;
  }[];
  upcomingEvents: {
    id: number;
    name: string;
    startDate: Date;
    registrationCount: number;
  }[];
  ticketDistribution: {
    ticketType: TicketType;
    count: number;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
}

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportPeriod, setReportPeriod] = useState("all-time");

  // We still query the backend data, but will use a unified approach through data fetching
  const { data: backendStats, isLoading: isBackendLoading } = USE_MOCK_DATA
    ? { data: null, isLoading: false } // Skip the real API call when using mock data
    : api.event.getOrganizerStats.useQuery();

  // Get data from either mock service or tRPC API
  const isLoading = USE_MOCK_DATA ? false : isBackendLoading;
  const stats = USE_MOCK_DATA
    ? mockDashboardService.getDashboardStats()
    : backendStats || mockDashboardService.getDashboardStats();

  // Generate CSV data for export
  const generateCSV = () => {
    if (!stats) return;

    // Create CSV header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    csvContent += `Total Events,${stats.totalEvents}\n`;
    csvContent += `Published Events,${stats.publishedEvents}\n`;
    csvContent += `Total Registrations,${stats.totalRegistrations}\n`;
    csvContent += `Total Revenue,$${stats.totalRevenue ? Number(stats.totalRevenue).toFixed(2) : "0.00"}\n\n`;

    // Add monthly revenue data
    csvContent += "Month,Revenue\n";
    stats.monthlyRevenue?.forEach((item) => {
      csvContent += `${item.month},$${item.revenue ? Number(item.revenue).toFixed(2) : "0.00"}\n`;
    });

    // Add ticket distribution data
    csvContent += "\nTicket Type,Count\n";
    stats.ticketDistribution?.forEach((item) => {
      csvContent += `${item.ticketType},${item.count}\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `event-dashboard-report-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format monthly data for the line chart
  const formatMonthlyData = () => {
    if (!stats?.monthlyRevenue) return [];

    return stats.monthlyRevenue.map((item) => {
      // Format the month for display (e.g., "2024-05" to "May 2024")
      const [year, month] = item.month.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthName = date.toLocaleString("default", { month: "short" });

      return {
        name: `${monthName} ${year}`,
        revenue: Number(item.revenue || 0),
      };
    });
  };

  // Format ticket distribution data for the pie chart
  const formatTicketData = () => {
    if (!stats?.ticketDistribution) return [];

    return stats.ticketDistribution.map((item) => ({
      name: item.ticketType === "general" ? "General" : "VIP",
      value: Number(item.count || 0),
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateCSV}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button asChild>
            <Link href="/organizer/events/new">Create New Event</Link>
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="events">My Events</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
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
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-2xl font-bold">
                        {stats?.totalEvents || 0}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stats?.publishedEvents || 0} published events
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="text-2xl font-bold">
                        {stats?.totalRegistrations || 0}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Across all your events
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div className="text-2xl font-bold">
                        $
                        {stats?.totalRevenue
                          ? Number(stats.totalRevenue).toFixed(2)
                          : "0.00"}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      From confirmed registrations
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ticket Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {formatTicketData().map((item, index) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{item.name}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                          <Progress
                            value={
                              stats?.totalRegistrations
                                ? (item.value /
                                    Number(stats.totalRegistrations)) *
                                  100
                                : 0
                            }
                            className="h-1"
                            indicatorClassName={
                              index === 0 ? "bg-blue-500" : "bg-green-500"
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Last 6 months of revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatMonthlyData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`$${value}`, "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Your next scheduled events</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : stats?.upcomingEvents?.length ? (
                  <div className="space-y-3">
                    {stats.upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.startDate).toLocaleDateString()} •{" "}
                            {event.registrationCount} attendees
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/organizer/events/${event.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">
                    No upcoming events
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                Recent event and ticket activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats?.recentRegistrations?.length ? (
                <div className="space-y-2">
                  {stats.recentRegistrations.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-2 w-2 rounded-full ${
                            activity.actionType === "purchase"
                              ? "bg-green-500"
                              : activity.actionType === "cancellation"
                                ? "bg-red-500"
                                : activity.actionType === "refund"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{activity.eventName}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                            {activity.amount ? ` - $${activity.amount}` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString()}
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

        <TabsContent value="analytics" className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Analytics Dashboard</h2>
            <div className="flex items-center space-x-2">
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-time">All time</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="past-3-months">Past 3 months</SelectItem>
                  <SelectItem value="past-6-months">Past 6 months</SelectItem>
                  <SelectItem value="past-year">Past year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={generateCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Revenue Analysis</CardTitle>
                <CardDescription>Revenue trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-[300px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatMonthlyData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`$${value}`, "Revenue"]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Ticket Distribution</CardTitle>
                <CardDescription>By ticket type</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-[300px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={formatTicketData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {formatTicketData().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, "Tickets"]} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Detailed revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Revenue</TableCell>
                      <TableCell>
                        $
                        {stats?.totalRevenue
                          ? Number(stats.totalRevenue).toFixed(2)
                          : "0.00"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Revenue per Event</TableCell>
                      <TableCell>
                        $
                        {stats?.publishedEvents &&
                        stats.totalRevenue &&
                        Number(stats.publishedEvents) > 0
                          ? (
                              Number(stats.totalRevenue) /
                              Number(stats.publishedEvents)
                            ).toFixed(2)
                          : "0.00"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Ticket Price</TableCell>
                      <TableCell>
                        $
                        {stats?.totalRegistrations &&
                        stats.totalRevenue &&
                        Number(stats.totalRegistrations) > 0
                          ? (
                              Number(stats.totalRevenue) /
                              Number(stats.totalRegistrations)
                            ).toFixed(2)
                          : "0.00"}
                      </TableCell>
                    </TableRow>
                    {formatTicketData().map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name} Ticket Revenue</TableCell>
                        <TableCell>
                          $
                          {stats?.ticketDistribution &&
                          stats.totalRegistrations &&
                          stats.totalRevenue &&
                          Number(stats.totalRegistrations) > 0
                            ? (
                                (item.value /
                                  Number(stats.totalRegistrations)) *
                                Number(stats.totalRevenue)
                              ).toFixed(2)
                            : "0.00"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
  // We still query the backend data, but will prefer mock data during development
  const { data: backendEvents, isLoading: isBackendLoading } = USE_MOCK_DATA
    ? { data: null, isLoading: false } // Skip the real API call when using mock data
    : api.event.getOrganizerEvents.useQuery();

  // Use mock data directly in development, or as fallback in production
  const isLoading = USE_MOCK_DATA ? false : isBackendLoading;
  const events = USE_MOCK_DATA
    ? mockDashboardService.getEvents()
    : backendEvents || mockDashboardService.getEvents();

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
  // We still query the backend data, but will prefer mock data during development
  const { data: backendAttendees, isLoading: isBackendLoading } = USE_MOCK_DATA
    ? { data: null, isLoading: false } // Skip the real API call when using mock data
    : api.event.getOrganizerAttendees.useQuery();

  // Use mock data directly in development, or as fallback in production
  const isLoading = USE_MOCK_DATA ? false : isBackendLoading;
  const attendees = USE_MOCK_DATA
    ? mockDashboardService.getAttendees()
    : backendAttendees || mockDashboardService.getAttendees();

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee) => (
                <TableRow key={attendee.id}>
                  <TableCell className="font-medium">
                    {attendee.userName}
                  </TableCell>
                  <TableCell>{attendee.eventName}</TableCell>
                  <TableCell className="capitalize">
                    {attendee.ticketType}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>${attendee.totalAmount}</TableCell>
                  <TableCell>
                    {new Date(attendee.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
