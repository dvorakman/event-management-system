"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

interface TicketData {
  ticketId: string;
  eventName: string;
  ticketType: "general" | "vip";
  purchaseDate: string;
}

export default function RegistrationSuccessPage({
  params,
}: {
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  const verifyPaymentMutation = api.event.verifyPaymentAndCreateTicket.useMutation({
    onSuccess: (data) => {
      setTicketData(data);
      setLoading(false);
    },
    onError: (err) => {
      console.error("Verification error:", err);
      setError(err.message || "Failed to verify payment and create ticket");
      setLoading(false);
    },
  });

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("No session ID found");
        setLoading(false);
        return;
      }

      try {
        await verifyPaymentMutation.mutateAsync({
          sessionId,
          eventId: Number(params.id),
        });
      } catch (err) {
        // Error handling is done in onError callback
        console.error("Error in verifyPayment:", err);
      }
    };

    verifyPayment();
  }, [sessionId, params.id, verifyPaymentMutation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-lg text-gray-600">Processing your registration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-red-800">
            Registration Error
          </h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-yellow-800">
            No Ticket Data
          </h2>
          <p className="text-yellow-600">Unable to retrieve ticket information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-green-600">
            Registration Successful!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your ticket has been generated successfully.
          </p>
        </div>

        <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-700">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Ticket Information
          </h2>
          <div className="space-y-3">
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Ticket ID:</span>{" "}
              {ticketData.ticketId}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Event:</span> {ticketData.eventName}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Type:</span>{" "}
              {ticketData.ticketType === "vip" ? "VIP" : "General Admission"}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Purchase Date:</span>{" "}
              {new Date(ticketData.purchaseDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Print Ticket
          </button>
        </div>
      </div>
    </div>
  );
} 