"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { loadStripe } from "@stripe/stripe-js";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventName: string;
  generalPrice: number;
  vipPrice: number;
  vipPerks: string;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function RegistrationModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  generalPrice,
  vipPrice,
  vipPerks,
}: RegistrationModalProps) {
  const [ticketType, setTicketType] = useState<"general" | "vip">("general");
  const [loading, setLoading] = useState(false);

  const createPaymentSession = api.event.createPaymentSession.useMutation();

  const handleRegistration = async () => {
    try {
      setLoading(true);
      
      // Get Stripe instance
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      // Create a payment session through our API
      const response = await createPaymentSession.mutateAsync({
        eventId,
        ticketType,
      });

      // Redirect to Stripe checkout
      const result = await stripe.redirectToCheckout({
        sessionId: response.sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Handle error (you might want to show an error message to the user)
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Register for {eventName}
        </h2>

        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="general"
              name="ticketType"
              value="general"
              checked={ticketType === "general"}
              onChange={() => setTicketType("general")}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="general"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              General Admission (${generalPrice})
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="vip"
              name="ticketType"
              value="vip"
              checked={ticketType === "vip"}
              onChange={() => setTicketType("vip")}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="vip"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              VIP Ticket (${vipPrice})
            </label>
          </div>

          {ticketType === "vip" && (
            <div className="ml-7 mt-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                VIP Perks: {vipPerks}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleRegistration}
            disabled={loading || createPaymentSession.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading || createPaymentSession.isPending ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
} 