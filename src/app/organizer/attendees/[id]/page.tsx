"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
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
import { Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";

export default function AttendeeDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const registrationId = Number.parseInt(params.id, 10);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<
    "confirmed" | "cancelled" | "refunded"
  >("confirmed");

  const { data: registration, isLoading } =
    api.event.getRegistrationDetails.useQuery(
      { registrationId },
      {
        retry: false,
        onError: () => {
          toast({
            title: "Error",
            description:
              "Registration not found or you don't have access to view it.",
            variant: "destructive",
          });
          router.push("/organizer/dashboard");
        },
      },
    );

  const updateStatusMutation = api.event.updateRegistrationStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: `Registration has been marked as ${newStatus}.`,
      });
      setShowStatusDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = () => {
    updateStatusMutation.mutate({
      registrationId,
      status: newStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="container mx-auto mt-16 px-4 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Registration Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The registration you are looking for does not exist or you don't have
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
        <h1 className="text-3xl font-bold">Attendee Details</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-medium">{registration.userName}</p>
              <p className="text-muted-foreground">{registration.userEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Mail className="h-4 w-4" /> Email
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-full p-1 ${
                  registration.status === "confirmed"
                    ? "bg-green-100"
                    : registration.status === "cancelled"
                      ? "bg-red-100"
                      : registration.status === "refunded"
                        ? "bg-blue-100"
                        : "bg-yellow-100"
                }`}
              >
                <CheckCircle2
                  className={`h-5 w-5 ${
                    registration.status === "confirmed"
                      ? "text-green-600"
                      : registration.status === "cancelled"
                        ? "text-red-600"
                        : registration.status === "refunded"
                          ? "text-blue-600"
                          : "text-yellow-600"
                  }`}
                />
              </div>
              <div>
                <p className="font-medium capitalize">{registration.status}</p>
                <p className="text-sm text-muted-foreground">
                  Updated on{" "}
                  {new Date(
                    registration.updatedAt || registration.createdAt,
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div>
              <Button onClick={() => setShowStatusDialog(true)}>
                Change Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-semibold">{registration.eventName}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(registration.eventDate).toLocaleDateString()} at{" "}
                {registration.eventLocation}
              </p>
            </div>
            <div>
              <p>
                <span className="font-medium">Ticket Type:</span>{" "}
                <span className="capitalize">{registration.ticketType}</span>
              </p>
              <p>
                <span className="font-medium">Price:</span> $
                {Number(registration.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>
          <div>
            <p className="font-medium">Payment Status:</p>
            <p
              className={`capitalize ${
                registration.paymentStatus === "completed"
                  ? "text-green-600"
                  : registration.paymentStatus === "refunded"
                    ? "text-blue-600"
                    : "text-yellow-600"
              }`}
            >
              {registration.paymentStatus}
            </p>
          </div>
          <div>
            <p className="font-medium">Registration Date:</p>
            <p>{new Date(registration.createdAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {registration.ticket && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ticket Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-lg border bg-white p-4">
                <img
                  src={registration.ticket.qrCode}
                  alt="Ticket QR Code"
                  className="mx-auto h-48 w-48"
                />
                <p className="mt-2 text-center font-mono font-bold">
                  {registration.ticket.ticketNumber}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p>
                <span className="font-medium">Used:</span>{" "}
                {registration.ticket.isUsed ? "Yes" : "No"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Registration Status</DialogTitle>
            <DialogDescription>
              Change the status of this registration. This will notify the
              attendee.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block font-medium">New Status</label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
