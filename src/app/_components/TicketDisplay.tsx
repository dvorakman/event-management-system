"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";

interface TicketData {
  ticketId: string; // Assuming this is the ticket number
  eventName: string;
  ticketType: string;
  purchaseDate: Date;
  qrCodeUrl?: string; // Add QR code URL field here too
}

interface TicketDisplayProps {
  ticket: TicketData | null;
}

export function TicketDisplay({ ticket }: TicketDisplayProps) {
  if (!ticket) {
    return <p>Error displaying ticket details.</p>;
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Registration Confirmed!</CardTitle>
        <CardDescription>
          Here is your ticket for {ticket.eventName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">Ticket Number</p>
          <p className="font-mono text-lg font-semibold tracking-wider">
            {ticket.ticketId}
          </p>
        </div>

        {/* Display QR Code if available */}
        {ticket.qrCodeUrl ? (
          <div className="flex justify-center rounded-lg border bg-white p-4">
            <img
              src={ticket.qrCodeUrl}
              alt={`QR Code for ticket ${ticket.ticketId}`}
              className="h-40 w-40"
            />
          </div>
        ) : (
          // Fallback if QR code is missing for some reason
          <div className="rounded-lg border bg-muted/50 p-4 text-center">
            <p className="font-semibold">QR Code Unavailable</p>
            <p className="text-sm text-muted-foreground">
              Could not load QR code.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <p>
            <span className="font-medium">Event:</span> {ticket.eventName}
          </p>
          <p>
            <span className="font-medium">Ticket Type:</span>{" "}
            <span className="capitalize">{ticket.ticketType}</span>
          </p>
          <p>
            <span className="font-medium">Purchase Date:</span>{" "}
            {new Date(ticket.purchaseDate).toLocaleString()}
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <Button asChild>
            <Link href="/dashboard?tab=tickets">View All My Tickets</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
