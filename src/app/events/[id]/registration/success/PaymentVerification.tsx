"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { TicketDisplay } from "~/app/_components/TicketDisplay";

interface TicketData {
  ticketId: string;
  eventName: string;
  ticketType: string;
  purchaseDate: Date;
  qrCodeUrl?: string; // Make QR code URL optional initially
}

export default function PaymentVerification({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [mutationInitialized, setMutationInitialized] = useState(false);

  const searchParams = useSearchParams();
  const session_id = searchParams.get("session_id");
  const { isLoaded, isSignedIn, user } = useUser();

  console.log("Payment verification auth state:", {
    isLoaded,
    isSignedIn,
    user: user ? { id: user.id } : null,
    session_id,
  });

  const verifyPaymentMutation = api.event.verifyPayment.useMutation({
    onSuccess: (data) => {
      console.log("Payment verification successful:", data);
      setTicketData({
        ticketId: data.ticketId,
        eventName: data.eventName,
        ticketType: data.ticketType,
        purchaseDate: data.purchaseDate,
        qrCodeUrl: data.qrCodeUrl,
      });
      setLoading(false);
    },
    onError: (error) => {
      console.error("Payment verification error:", error);
      setError(error.message);
      setLoading(false);
    },
  });

  useEffect(() => {
    if (!session_id) {
      setError("No session ID found. Cannot verify payment.");
      setLoading(false);
      return;
    }

    if (!isLoaded) {
      console.log("Auth is still loading...");
      return;
    }

    if (!isSignedIn || !user) {
      setError(
        "You must be logged in to verify payment. Please sign in and try again.",
      );
      setLoading(false);
      return;
    }

    if (!mutationInitialized) {
      setMutationInitialized(true);
      console.log("Verifying payment with session_id:", session_id);
      verifyPaymentMutation.mutate({
        eventId: parseInt(eventId, 10),
        sessionId: session_id,
      });
    }
  }, [
    session_id,
    isLoaded,
    isSignedIn,
    user,
    eventId,
    verifyPaymentMutation,
    mutationInitialized,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h1 className="mt-4 text-xl font-semibold">
            Verifying your payment...
          </h1>
          <p className="mt-2 text-gray-600">
            This may take a moment. Please don't close this page.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Payment Verification Failed
          </h1>
          <p className="mt-4 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (ticketData) {
    return <TicketDisplay ticket={ticketData} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Unexpected Error</h1>
        <p className="mt-4 text-gray-600">
          Something went wrong while processing your ticket.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
