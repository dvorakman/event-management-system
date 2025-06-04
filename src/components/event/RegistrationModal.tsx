"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { useToast } from "~/hooks/use-toast";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventName: string;
  generalPrice: number;
  vipPrice: number;
  vipPerks: string;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

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
  const { toast } = useToast();

  const createPaymentSession = api.event.createPaymentSession.useMutation({
    onError: (error) => {
      console.error("createPaymentSession Mutation Error:", error);
      toast({
        title: "Payment Error",
        description: `Failed to initiate payment session: ${error.message}`,
        variant: "destructive",
      });
      setLoading(false);
    },
  });

  const handleRegistration = async () => {
    setLoading(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error(
          "Stripe.js failed to load. Please check your internet connection or ad blocker.",
        );
      }

      const response = await createPaymentSession.mutateAsync({
        eventId,
        ticketType,
      });

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: response.sessionId,
      });

      if (stripeError) {
        throw new Error(`Stripe redirect failed: ${stripeError.message}`);
      }
    } catch (error: unknown) {
      console.error("Registration Handler Error:", error);
      let errorMessage = "An unexpected error occurred during registration.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register for {eventName}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={ticketType}
            onValueChange={(value) => setTicketType(value as "general" | "vip")}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="general" id="general" />
              <Label htmlFor="general">
                General Admission (${generalPrice})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="vip" id="vip" />
              <Label htmlFor="vip">VIP Ticket (${vipPrice})</Label>
            </div>
          </RadioGroup>

          {ticketType === "vip" && (
            <div className="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/30">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                VIP Perks: {vipPerks}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRegistration}
            disabled={loading || createPaymentSession.isPending}
          >
            {loading || createPaymentSession.isPending
              ? "Processing..."
              : "Proceed to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
