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

// Mock data for attendees list (defined first so we can calculate totals from it)
const MOCK_ATTENDEES: Attendee[] = [
  {
    id: 1,
    userId: "user123",
    userName: "John Smith",
    eventId: 101,
    eventName: "Tech Conference 2024",
    ticketType: "vip",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 199.99,
    createdAt: new Date("2024-05-20"),
  },
  {
    id: 2,
    userId: "user456",
    userName: "Emma Johnson",
    eventId: 102,
    eventName: "Summer Music Festival",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 89.99,
    createdAt: new Date("2024-05-18"),
  },
  {
    id: 3,
    userId: "user789",
    userName: "Michael Brown",
    eventId: 101,
    eventName: "Tech Conference 2024",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 99.99,
    createdAt: new Date("2024-05-15"),
  },
  {
    id: 4,
    userId: "user234",
    userName: "Sarah Wilson",
    eventId: 103,
    eventName: "Business Networking",
    ticketType: "vip",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 149.99,
    createdAt: new Date("2024-05-10"),
  },
  {
    id: 5,
    userId: "user567",
    userName: "David Lee",
    eventId: 101,
    eventName: "Tech Conference 2024",
    ticketType: "general",
    status: "pending",
    paymentStatus: "pending",
    totalAmount: 99.99,
    createdAt: new Date("2024-05-08"),
  },
  {
    id: 6,
    userId: "user890",
    userName: "Jessica Chen",
    eventId: 102,
    eventName: "Summer Music Festival",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 89.99,
    createdAt: new Date("2024-05-07"),
  },
  {
    id: 7,
    userId: "user123",
    userName: "John Smith",
    eventId: 101,
    eventName: "Tech Conference 2024",
    ticketType: "general",
    status: "cancelled",
    paymentStatus: "refunded",
    totalAmount: 99.99,
    createdAt: new Date("2024-05-06"),
  },
  {
    id: 8,
    userId: "user345",
    userName: "Alex Martinez",
    eventId: 104,
    eventName: "AI Workshop",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 79.99,
    createdAt: new Date("2024-05-05"),
  },
  {
    id: 9,
    userId: "user678",
    userName: "Olivia Taylor",
    eventId: 103,
    eventName: "Business Networking",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 49.99,
    createdAt: new Date("2024-05-03"),
  },
  {
    id: 10,
    userId: "user901",
    userName: "Ryan Jackson",
    eventId: 102,
    eventName: "Summer Music Festival",
    ticketType: "vip",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 179.99,
    createdAt: new Date("2024-05-01"),
  },
  // Additional attendees to match total registrations
  {
    id: 11,
    userId: "user902",
    userName: "Jennifer Lopez",
    eventId: 101,
    eventName: "Tech Conference 2024",
    ticketType: "vip",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 199.99,
    createdAt: new Date("2024-04-29"),
  },
  {
    id: 12,
    userId: "user903",
    userName: "Thomas Wilson",
    eventId: 101,
    eventName: "Tech Conference 2024",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 99.99,
    createdAt: new Date("2024-04-28"),
  },
  {
    id: 13,
    userId: "user904",
    userName: "Maria Garcia",
    eventId: 102,
    eventName: "Summer Music Festival",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 89.99,
    createdAt: new Date("2024-04-25"),
  },
  {
    id: 14,
    userId: "user905",
    userName: "Robert Johnson",
    eventId: 103,
    eventName: "Business Networking",
    ticketType: "general",
    status: "confirmed",
    paymentStatus: "completed",
    totalAmount: 49.99,
    createdAt: new Date("2024-04-20"),
  },
];

// Calculate event registration counts based on confirmed attendees
const calculateEventRegistrations = (): Record<number, number> => {
  const eventCounts: Record<number, number> = {};
  MOCK_ATTENDEES.forEach((attendee) => {
    if (attendee.status === "confirmed") {
      eventCounts[attendee.eventId] = (eventCounts[attendee.eventId] || 0) + 1;
    }
  });
  return eventCounts;
};

// Calculate ticket type distribution
const calculateTicketDistribution = () => {
  const typeCount: Record<TicketType, number> = { general: 0, vip: 0 };
  MOCK_ATTENDEES.forEach((attendee) => {
    if (attendee.status === "confirmed") {
      typeCount[attendee.ticketType] =
        (typeCount[attendee.ticketType] || 0) + 1;
    }
  });
  return [
    { ticketType: "general", count: typeCount.general },
    { ticketType: "vip", count: typeCount.vip },
  ];
};

// Calculate total revenue from confirmed attendees
const calculateTotalRevenue = (): number => {
  return MOCK_ATTENDEES.filter((a) => a.status === "confirmed").reduce(
    (sum, attendee) => sum + attendee.totalAmount,
    0,
  );
};

// Get confirmed registrations count
const getConfirmedRegistrations = (): number => {
  return MOCK_ATTENDEES.filter((a) => a.status === "confirmed").length;
};

// Calculate all the derived data
const eventRegistrations = calculateEventRegistrations();
const ticketDistribution = calculateTicketDistribution();
const totalRevenue = calculateTotalRevenue();
const confirmedRegistrations = getConfirmedRegistrations();

// Mock data for events list
const MOCK_EVENTS: Event[] = [
  {
    id: 101,
    name: "Tech Conference 2024",
    description:
      "A three-day conference featuring the latest in tech innovations, workshops, and networking opportunities.",
    startDate: new Date("2024-06-15"),
    endDate: new Date("2024-06-18"),
    location: "San Francisco, CA",
    type: "conference",
    generalTicketPrice: 99.99,
    vipTicketPrice: 199.99,
    maxAttendees: 500,
    status: "published",
    createdAt: new Date("2024-03-01"),
    registrations: eventRegistrations[101] || 0,
  },
  {
    id: 102,
    name: "Summer Music Festival",
    description:
      "Annual outdoor music festival featuring top bands and solo artists across multiple genres.",
    startDate: new Date("2024-07-10"),
    endDate: new Date("2024-07-12"),
    location: "Austin, TX",
    type: "concert",
    generalTicketPrice: 89.99,
    vipTicketPrice: 179.99,
    maxAttendees: 2000,
    status: "published",
    createdAt: new Date("2024-02-15"),
    registrations: eventRegistrations[102] || 0,
  },
  {
    id: 103,
    name: "Business Networking",
    description:
      "An evening of networking with professionals from various industries.",
    startDate: new Date("2024-06-05"),
    endDate: new Date("2024-06-05"),
    location: "New York, NY",
    type: "networking",
    generalTicketPrice: 49.99,
    vipTicketPrice: 149.99,
    maxAttendees: 150,
    status: "published",
    createdAt: new Date("2024-04-20"),
    registrations: eventRegistrations[103] || 0,
  },
  {
    id: 104,
    name: "AI Workshop",
    description:
      "Hands-on workshop on implementing AI solutions for businesses.",
    startDate: new Date("2024-08-20"),
    endDate: new Date("2024-08-21"),
    location: "Seattle, WA",
    type: "workshop",
    generalTicketPrice: 79.99,
    vipTicketPrice: 159.99,
    maxAttendees: 100,
    status: "draft",
    createdAt: new Date("2024-05-01"),
    registrations: eventRegistrations[104] || 0,
  },
  {
    id: 105,
    name: "Digital Marketing Summit",
    description:
      "Learn the latest digital marketing strategies from industry experts.",
    startDate: new Date("2024-09-15"),
    endDate: new Date("2024-09-17"),
    location: "Chicago, IL",
    type: "conference",
    generalTicketPrice: 129.99,
    vipTicketPrice: 249.99,
    maxAttendees: 300,
    status: "draft",
    createdAt: new Date("2024-05-05"),
    registrations: eventRegistrations[105] || 0,
  },
];

// Mock data for testing
const MOCK_DATA = {
  totalEvents: MOCK_EVENTS.length,
  publishedEvents: MOCK_EVENTS.filter((e) => e.status === "published").length,
  totalRegistrations: confirmedRegistrations,
  totalRevenue: totalRevenue,
  recentRegistrations: MOCK_ATTENDEES.filter((a) => a.status === "confirmed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      eventName: a.eventName,
      ticketType: a.ticketType,
      amount: a.totalAmount,
      date: a.createdAt,
    })),
  upcomingEvents: MOCK_EVENTS.filter(
    (e) => e.status === "published" && e.startDate > new Date(),
  )
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 3)
    .map((e) => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      registrationCount: e.registrations,
    })),
  ticketDistribution: ticketDistribution,
  monthlyRevenue: [
    { month: "2023-12", revenue: 350 },
    { month: "2024-01", revenue: 550 },
    { month: "2024-02", revenue: 720 },
    { month: "2024-03", revenue: 880 },
    { month: "2024-04", revenue: 1050 },
    { month: "2024-05", revenue: totalRevenue / 2 }, // Split revenue between last two months
    { month: "2024-06", revenue: totalRevenue / 2 },
  ],
};

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportPeriod, setReportPeriod] = useState("all-time");

  // We still query the backend data, but will prefer mock data during development
  const { data: backendStats, isLoading: isBackendLoading } = USE_MOCK_DATA
    ? { data: null, isLoading: false } // Skip the real API call when using mock data
    : api.event.getOrganizerStats.useQuery();

  // Use mock data directly in development, or as fallback in production
  const isLoading = USE_MOCK_DATA ? false : isBackendLoading;
  const stats = USE_MOCK_DATA ? MOCK_DATA : backendStats || MOCK_DATA;

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

    return stats.monthlyRevenue.map((item) => ({
      name: item.month,
      revenue: Number(item.revenue || 0),
    }));
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
  const events = USE_MOCK_DATA ? MOCK_EVENTS : backendEvents || MOCK_EVENTS;

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
    ? MOCK_ATTENDEES
    : backendAttendees || MOCK_ATTENDEES;

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
