"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "~/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";

export default function EventDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const eventId = params.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const {
    data: eventDetails,
    isLoading: isLoadingDetails,
    refetch,
  } = api.event.getEventDetails.useQuery({ id: eventId });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    type: "conference",
    generalTicketPrice: 0,
    vipTicketPrice: 0,
    vipPerks: "",
    maxAttendees: 100,
    status: "draft",
  });

  useEffect(() => {
    if (eventDetails) {
      // Format date for datetime-local input
      const formatDate = (date: Date | string) => {
        const d = new Date(date);
        // Format as YYYY-MM-DDThh:mm
        return d.toISOString().slice(0, 16);
      };

      setFormData({
        name: eventDetails.name,
        description: eventDetails.description,
        startDate: formatDate(eventDetails.startDate),
        endDate: formatDate(eventDetails.endDate),
        location: eventDetails.location,
        type: eventDetails.type,
        generalTicketPrice: Number(eventDetails.generalTicketPrice),
        vipTicketPrice: Number(eventDetails.vipTicketPrice),
        vipPerks: eventDetails.vipPerks,
        maxAttendees: eventDetails.maxAttendees,
        status: eventDetails.status,
      });
    }
  }, [eventDetails]);

  const updateEventMutation = api.event.updateEvent.useMutation({
    onSuccess: () => {
      toast({
        title: "Event updated successfully",
        description: "Your event has been updated.",
      });
      refetch();
      setIsLoading(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating event",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const deleteEventMutation = api.event.deleteEvent.useMutation({
    onSuccess: () => {
      toast({
        title: "Event deleted successfully",
        description: "Your event has been deleted.",
      });
      router.push("/organizer/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    },
  });

  const cancelEventMutation = api.event.updateEvent.useMutation({
    onSuccess: () => {
      toast({
        title: "Event cancelled successfully",
        description: "Your event has been cancelled and attendees notified.",
      });
      refetch();
      setShowCancelDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error cancelling event",
        description: error.message,
        variant: "destructive",
      });
      setShowCancelDialog(false);
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: Number.parseFloat(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Parse dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    updateEventMutation.mutate({
      id: eventId,
      name: formData.name,
      description: formData.description,
      startDate,
      endDate,
      location: formData.location,
      type: formData.type as
        | "conference"
        | "concert"
        | "workshop"
        | "networking"
        | "other",
      generalTicketPrice: formData.generalTicketPrice,
      vipTicketPrice: formData.vipTicketPrice,
      vipPerks: formData.vipPerks,
      maxAttendees: formData.maxAttendees,
      status: formData.status as
        | "draft"
        | "published"
        | "cancelled"
        | "completed",
    });
  };

  const handleDelete = () => {
    deleteEventMutation.mutate({ id: eventId });
  };

  const handleCancel = () => {
    cancelEventMutation.mutate({
      id: eventId,
      status: "cancelled",
    });
  };

  if (isLoadingDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="container mx-auto mt-16 px-4 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Event Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The event you are looking for does not exist or you don't have
          permission to view it.
        </p>
        <Button
          className="mt-6"
          onClick={() => router.push("/organizer/dashboard")}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{eventDetails.name}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/organizer/dashboard")}
          >
            Back to Dashboard
          </Button>
          {eventDetails.status !== "cancelled" && (
            <Button
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel Event
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventDetails.stats.totalRegistrations}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Confirmed Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventDetails.stats.confirmedRegistrations}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(eventDetails.stats.totalRevenue).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit Event</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">Event Information</h3>
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Type:</span>{" "}
                      {eventDetails.type}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{" "}
                      {eventDetails.location}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          eventDetails.status === "published"
                            ? "bg-green-100 text-green-800"
                            : eventDetails.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {eventDetails.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Timing</h3>
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Start Date:</span>{" "}
                      {new Date(eventDetails.startDate).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">End Date:</span>{" "}
                      {new Date(eventDetails.endDate).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Ticket Information</h3>
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">General Ticket Price:</span>{" "}
                      ${Number(eventDetails.generalTicketPrice).toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">VIP Ticket Price:</span> $
                      {Number(eventDetails.vipTicketPrice).toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Maximum Attendees:</span>{" "}
                      {eventDetails.maxAttendees}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">VIP Perks</h3>
                  <p className="text-sm text-muted-foreground">
                    {eventDetails.vipPerks}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Description</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {eventDetails.description}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTab("edit")}>
                  Edit Event
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle>Edit Event</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Event Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      minLength={3}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      minLength={3}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Event Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        handleSelectChange("type", value)
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="concert">Concert</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAttendees">Maximum Attendees</Label>
                    <Input
                      id="maxAttendees"
                      name="maxAttendees"
                      type="number"
                      min={1}
                      value={formData.maxAttendees}
                      onChange={handleNumberChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="generalTicketPrice">
                      General Ticket Price ($)
                    </Label>
                    <Input
                      id="generalTicketPrice"
                      name="generalTicketPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.generalTicketPrice}
                      onChange={handleNumberChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vipTicketPrice">VIP Ticket Price ($)</Label>
                    <Input
                      id="vipTicketPrice"
                      name="vipTicketPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.vipTicketPrice}
                      onChange={handleNumberChange}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="vipPerks">VIP Perks</Label>
                    <Textarea
                      id="vipPerks"
                      name="vipPerks"
                      value={formData.vipPerks}
                      onChange={handleChange}
                      required
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Event Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      minLength={10}
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleSelectChange("status", value)
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setActiveTab("overview")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registrations">
          <RegistrationsList eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone. All registrations and tickets for this event will be
              cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {deleteEventMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Event Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this event? All attendees will be
              notified, and registrations will be marked as cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              No, Keep Event
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              {cancelEventMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, Cancel Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistrationsList({ eventId }: { eventId: string }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: registrations, isLoading } =
    api.event.getEventRegistrations.useQuery({
      eventId,
      status: statusFilter as any,
    });

  const updateStatusMutation = api.event.updateRegistrationStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Registration status updated",
        description: "The registration status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (registrationId: string, status: string) => {
    updateStatusMutation.mutate({
      registrationId,
      status: status as "confirmed" | "cancelled" | "refunded",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registrations</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Registrations</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {registrations && registrations.length > 0 ? (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{registration.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {registration.userEmail} - {registration.ticketType} ticket
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        registration.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : registration.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : registration.status === "refunded"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {registration.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ${Number(registration.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    disabled={updateStatusMutation.isPending}
                    onValueChange={(value) =>
                      handleStatusChange(registration.id, value)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirm</SelectItem>
                      <SelectItem value="cancelled">Cancel</SelectItem>
                      <SelectItem value="refunded">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No registrations found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
