"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";

interface TicketData {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  ticketPrice: number;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  qrCode: string;
}

interface TicketDisplayProps {
  ticket: TicketData;
}

export function TicketDisplay({ ticket }: TicketDisplayProps) {
  const handleDownload = () => {
    // Create a temporary link to download the QR code
    const link = document.createElement("a");
    link.href = ticket.qrCode;
    link.download = `ticket-qr-${ticket.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full print:max-w-full">
        <h1 className="text-3xl font-bold text-center mb-8 print:text-2xl">
          Your Ticket is Ready!
        </h1>
        
        <Card className="w-full shadow-lg print:shadow-none">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white print:bg-gray-200 print:text-black">
            <CardTitle className="text-xl font-bold text-center">{ticket.eventName}</CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-500">Attendee</h3>
                <p className="text-lg">{ticket.name}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-500">Email</h3>
                <p>{ticket.email}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-500">Date</h3>
                <p>{formatDate(new Date(ticket.eventDate))}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-500">Location</h3>
                <p>{ticket.eventLocation}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-500">Ticket Type</h3>
                <p>{ticket.ticketType}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-500">Ticket ID</h3>
                <p className="font-mono text-sm">{ticket.id}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-2 rounded-lg shadow-md mb-4">
                {ticket.qrCode ? (
                  <Image 
                    src={ticket.qrCode} 
                    alt="Ticket QR Code" 
                    width={200} 
                    height={200}
                    className="mx-auto"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] bg-gray-200 flex items-center justify-center">
                    <p className="text-gray-500">QR Code Unavailable</p>
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-gray-500">
                Scan this QR code at the event entrance
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 p-6 print:hidden">
            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline">
                Download QR
              </Button>
              <Button onClick={handlePrint} variant="outline">
                Print Ticket
              </Button>
            </div>
            <Link href={`/events/${ticket.eventId}`}>
              <Button variant="default">
                Return to Event
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center print:hidden">
          <p className="text-gray-600">
            You'll also receive a confirmation email with your ticket details.
          </p>
        </div>
      </div>
    </div>
  );
} 
