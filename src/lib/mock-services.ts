// This file provides mock data services for development
// It can be used to simulate API responses when testing components

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

// Dashboard data interface
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

// Mock dashboard service - this mirrors the structure used in the dashboard page
export const mockDashboardService = {
  // Mock attendee data - the source of truth
  getAttendees: (): Attendee[] => [
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
      eventId: 103,
      eventName: "Business Networking",
      ticketType: "general",
      status: "confirmed",
      paymentStatus: "completed",
      totalAmount: 49.99,
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
  ],

  // Mock event data with consistent derived values
  getEvents: (): Event[] => {
    const attendees = mockDashboardService.getAttendees();

    // Calculate event registrations based on confirmed attendees
    const eventRegistrations: Record<number, number> = {};
    attendees.forEach((attendee) => {
      if (attendee.status === "confirmed") {
        eventRegistrations[attendee.eventId] = (eventRegistrations[attendee.eventId] || 0) + 1;
      }
    });

    return [
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
        registrations: 0, // Draft events should not have registrations
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
        registrations: 0, // Draft events should not have registrations
      },
    ];
  },

  // Dashboard stats derived from the attendees and events
  getDashboardStats: (): DashboardData => {
    const attendees = mockDashboardService.getAttendees();
    const events = mockDashboardService.getEvents();

    // Get only confirmed attendees
    const confirmedAttendees = attendees.filter(
      (a) => a.status === "confirmed",
    );

    // Calculate total revenue
    const totalRevenue = confirmedAttendees.reduce(
      (sum, attendee) => sum + attendee.totalAmount,
      0,
    );

    // Calculate ticket distribution
    const typeCount: Record<TicketType, number> = { general: 0, vip: 0 };
    confirmedAttendees.forEach((attendee) => {
      typeCount[attendee.ticketType] = (typeCount[attendee.ticketType] || 0) + 1;
    });

    // Calculate monthly revenue based on actual attendee data
    const monthlyRevenueMap = new Map<string, number>();
    
    // Process all confirmed attendee data to group by month
    confirmedAttendees.forEach((attendee) => {
      const date = new Date(attendee.createdAt);
      const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const currentRevenue = monthlyRevenueMap.get(month) || 0;
      monthlyRevenueMap.set(month, currentRevenue + attendee.totalAmount);
    });
    
    // Convert map to array and sort by month
    const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // If there are less than 6 months of data, add some past months with zero revenue
    if (monthlyRevenue.length < 6) {
      const lastMonth = new Date();
      for (let i = 0; i < 6 - monthlyRevenue.length; i++) {
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const monthKey = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyRevenueMap.has(monthKey)) {
          monthlyRevenue.unshift({ month: monthKey, revenue: 0 });
        }
      }
    }
    
    // Take only the last 6 months
    const last6MonthsRevenue = monthlyRevenue.slice(-6);

    return {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.status === "published").length,
      totalRegistrations: confirmedAttendees.length,
      totalRevenue: totalRevenue,
      recentRegistrations: confirmedAttendees
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          eventId: a.eventId,
          eventName: a.eventName,
          actionType: "purchase",
          description: `${a.userName} purchased a ${a.ticketType} ticket`,
          ticketType: a.ticketType,
          amount: a.totalAmount,
          date: a.createdAt,
        })),
      upcomingEvents: events
        .filter((e) => e.status === "published" && e.startDate > new Date())
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .slice(0, 3)
        .map((e) => ({
          id: e.id,
          name: e.name,
          startDate: e.startDate,
          registrationCount: e.registrations,
        })),
      ticketDistribution: [
        { ticketType: "general", count: typeCount.general },
        { ticketType: "vip", count: typeCount.vip },
      ],
      monthlyRevenue: last6MonthsRevenue,
    };
  },
}; 