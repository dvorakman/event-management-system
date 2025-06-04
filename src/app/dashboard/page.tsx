"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import Link from "next/link";
import { Loader2, Eye, Calendar, MapPin, CreditCard, User, Phone, Utensils, Accessibility } from "lucide-react";
import { api } from "~/trpc/react";

// Define type for ticket data fetched from backend
interface UserTicket {
  registrationId: number;
  eventId: number;
  eventName: string;
  eventStartDate: Date;
  eventLocation: string;
  ticketType: "general" | "vip";
  purchaseDate: Date;
  ticketNumber: string | null; // Ticket might not exist yet
  qrCodeUrl: string | null; // QR code might not exist yet
  totalAmount: string;
  status: string;
  // Personal information fields
  dietaryRequirements: string | null;
  specialNeeds: string | null;
  emergencyContact: string | null;
}

// Component for detailed ticket view modal
function TicketDetailsModal({ ticket }: { ticket: UserTicket }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Ticket Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Ticket Details - {ticket.eventName}</span>
            <Badge variant={ticket.status === "confirmed" ? "default" : "secondary"}>
              {ticket.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Your complete ticket and registration information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Event Information */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Calendar className="h-4 w-4" />
              Event Details
            </h3>
            <div className="grid gap-2 pl-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{ticket.eventStartDate ? new Date(ticket.eventStartDate).toLocaleDateString("en-AU", {
                  weekday: "long",
                  year: "numeric", 
                  month: "long",
                  day: "numeric"
                }) : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span>{ticket.eventLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket Type:</span>
                <Badge variant="outline" className="capitalize">
                  {ticket.ticketType}
                </Badge>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <CreditCard className="h-4 w-4" />
              Payment Details
            </h3>
            <div className="grid gap-2 pl-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">${Number(ticket.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Date:</span>
                <span>{new Date(ticket.purchaseDate).toLocaleDateString("en-AU")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket Number:</span>
                <span className="font-mono">{ticket.ticketNumber || "Pending"}</span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="space-y-3 pl-6">
              {ticket.emergencyContact && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    Emergency Contact
                  </div>
                  <div className="text-sm mt-1">
                    {(() => {
                      try {
                        const contact = JSON.parse(ticket.emergencyContact);
                        return (
                          <div className="space-y-1">
                            {contact.name && <p><span className="font-medium">Name:</span> {contact.name}</p>}
                            {contact.phone && <p><span className="font-medium">Phone:</span> {contact.phone}</p>}
                          </div>
                        );
                      } catch {
                        // If it's not valid JSON, display as plain text
                        return <p>{ticket.emergencyContact}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {ticket.dietaryRequirements && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Utensils className="h-3 w-3" />
                    Dietary Requirements
                  </div>
                  <p className="text-sm mt-1">{ticket.dietaryRequirements}</p>
                </div>
              )}
              
              {ticket.specialNeeds && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Accessibility className="h-3 w-3" />
                    Special Needs
                  </div>
                  <p className="text-sm mt-1">{ticket.specialNeeds}</p>
                </div>
              )}

              {!ticket.emergencyContact && !ticket.dietaryRequirements && !ticket.specialNeeds && (
                <p className="text-sm text-muted-foreground italic">
                  No additional personal information provided
                </p>
              )}
            </div>
          </div>

          {/* QR Code */}
          {ticket.qrCodeUrl && (
            <div className="space-y-3">
              <h3 className="font-semibold">Event Entry</h3>
              <div className="flex flex-col items-center rounded-lg border p-4">
                <img
                  src={ticket.qrCodeUrl}
                  alt="Ticket QR Code"
                  className="h-32 w-32"
                />
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Present this QR code at the event entrance
                </p>
              </div>
            </div>
          )}

          {/* Event Link */}
          <div className="pt-4 border-t">
            <Link href={`/events/${ticket.eventId}`}>
              <Button variant="outline" className="w-full">
                <MapPin className="mr-2 h-4 w-4" />
                View Event Page
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Loading component
function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* Loading spinner */}
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-lg text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Main dashboard component that uses hooks
function DashboardContent() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const searchParams = useSearchParams();
  const initialLoadRef = useRef(true);

  // Get current tab from URL or default to overview
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "tickets" || tabParam === "notifications"
      ? tabParam
      : "overview";

  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: dbUser, isLoading: isUserLoading } =
    api.user.getCurrentUser.useQuery(undefined, {
      enabled: isLoaded && isSignedIn, // Fetch only when Clerk is loaded and user signed in
      refetchOnWindowFocus: true,
    });

  const {
    data: ticketsData,
    isLoading: isLoadingTickets,
    error: ticketsError,
  } = api.user.getMyTickets.useQuery(undefined, {
    enabled: isLoaded && isSignedIn, // Only fetch if logged in
  });

  // Handle tab changes with URL updates
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Create a new URLSearchParams object with the current params
    const params = new URLSearchParams(searchParams.toString());

    // Update or add the tab parameter
    if (value === "overview") {
      // If going to default tab, remove the parameter for cleaner URLs
      params.delete("tab");
    } else {
      params.set("tab", value);
    }

    // Update the URL without full navigation using replace
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  };

  // Handle auth redirects - only runs once on mount and when auth state changes
  useEffect(() => {
    // Early return if auth isn't loaded yet
    if (!isLoaded) return;

    // Handle not signed in case
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/dashboard");
      return;
    }

    // Only perform role-based redirect on initial load or when role changes
    // and only when on the main dashboard (no tab selected)
    if (initialLoadRef.current && dbUser && !tabParam) {
      if (dbUser.role === "organizer" || dbUser.role === "admin") {
        router.push("/organizer/dashboard");
      }
      // Mark that initial load is complete
      initialLoadRef.current = false;
    }
  }, [isLoaded, isSignedIn, dbUser, router, tabParam]);

  // Keep tab state synced with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "tickets" || tabFromUrl === "notifications") {
      setActiveTab(tabFromUrl);
    } else if (tabFromUrl === null && activeTab !== "overview") {
      setActiveTab("overview");
    }
  }, [searchParams, activeTab]);

  // Show loading state during auth check and initial data fetch
  if (!isLoaded || (isSignedIn && isUserLoading && !dbUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* Loading spinner */}
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Ensure user object exists before accessing properties
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-red-600">
          User data not available. Please try signing in again.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Dashboard</h1>
        <Button asChild>
          <Link href="/events">Browse Events</Link>
        </Button>
      </div>

      <Tabs
        defaultValue={initialTab}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-muted-foreground">Name</h3>
                  <p>{user.fullName || user.username}</p>
                </div>
                <div>
                  <h3 className="font-medium text-muted-foreground">Email</h3>
                  <p>{user.primaryEmailAddress?.emailAddress}</p>
                </div>

                <div className="pt-4">
                  <Link href="/account">
                    <Button variant="outline">Manage Profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Link href="/events">
                  <Button variant="secondary" className="w-full">
                    Browse All Events
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleTabChange("tickets")}
                >
                  View My Tickets
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events For You</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-muted-foreground">
                Explore our events to find something you might be interested in!
              </p>
              <div className="flex justify-center">
                <Link href="/events">
                  <Button>Browse Events</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Your Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTickets ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : ticketsError ? (
                <p className="text-center text-red-600">
                  Error loading tickets: {ticketsError.message}
                </p>
              ) : !ticketsData || ticketsData.length === 0 ? (
                <>
                  <p className="py-8 text-center text-muted-foreground">
                    You don't have any tickets yet. Browse events and register
                    to see your tickets here.
                  </p>
                  <div className="flex justify-center">
                    <Link href="/events">
                      <Button>Find Events</Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsData.map((ticket) => (
                    <Card
                      key={ticket.registrationId}
                      className="overflow-hidden"
                    >
                      <CardHeader>
                        <CardTitle className="line-clamp-1 text-lg">
                          {ticket.eventName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Ticket #{ticket.ticketNumber || "N/A"}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Date:</span>{" "}
                          {ticket.eventStartDate
                            ? new Date(
                                ticket.eventStartDate,
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Location:</span>{" "}
                          {ticket.eventLocation}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Type:</span>{" "}
                          <span className="capitalize">
                            {ticket.ticketType}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Purchased:</span>{" "}
                          {new Date(ticket.purchaseDate).toLocaleDateString()}
                        </p>

                        <div className="mt-4">
                          {ticket.qrCodeUrl ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={ticket.qrCodeUrl}
                                alt="Ticket QR Code"
                                className="h-24 w-24"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                QR Code Available
                              </p>
                            </div>
                          ) : (
                            <p className="text-center text-sm text-amber-600">
                              QR code will be available soon
                            </p>
                          )}
                        </div>

                        <div className="mt-4">
                          <TicketDetailsModal ticket={ticket} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Your Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-muted-foreground">
                You don't have any notifications right now.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export the wrapped component
export default function UserDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
