"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { redirect } from "next/navigation";

export default function UserDashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { data: dbUser, isLoading: isUserLoading } =
    api.user.getCurrentUser.useQuery();
  const [activeTab, setActiveTab] = useState("overview");

  // Handle loading state
  if (!isLoaded || isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle not signed in state
  if (!isSignedIn) {
    return redirect("/sign-in");
  }

  // Redirect organizers/admins to their dashboard
  if (dbUser?.role === "organizer" || dbUser?.role === "admin") {
    return redirect("/organizer/dashboard");
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
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
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
                <Link href="/tickets">
                  <Button variant="outline" className="w-full">
                    View My Tickets
                  </Button>
                </Link>
                <Link href="/become-organizer">
                  <Button variant="outline" className="w-full">
                    Become an Organizer
                  </Button>
                </Link>
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
              <p className="py-8 text-center text-muted-foreground">
                You don't have any tickets yet. Browse events and register to
                see your tickets here.
              </p>
              <div className="flex justify-center">
                <Link href="/events">
                  <Button>Find Events</Button>
                </Link>
              </div>
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
                You don't have any notifications yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
