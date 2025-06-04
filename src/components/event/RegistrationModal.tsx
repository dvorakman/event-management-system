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
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/hooks/use-toast";


interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  generalPrice: number;
  vipPrice: number;
  vipPerks: string;
  isSoldOut?: boolean;
  availableSpots?: number;
  userRegistration?: {
    id: string;
    status: string;
    ticketType: string;
  } | null;
}

interface RegistrationFormData {
  ticketType: "general" | "vip";
  dietaryRequirements: string;
  specialNeeds: string;
  emergencyContact: string;
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
  isSoldOut = false,
  availableSpots = 0,
  userRegistration = null,
}: RegistrationModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<RegistrationFormData>({
    ticketType: "general",
    dietaryRequirements: "",
    specialNeeds: "",
    emergencyContact: "",
  });

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

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegistration = async () => {
    if (!formData.ticketType) {
      toast({
        title: "Please select a ticket type",
        variant: "destructive",
      });
      return;
    }

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
        ticketType: formData.ticketType,
        eventSpecificData: {
          dietaryRequirements: formData.dietaryRequirements || undefined,
          specialNeeds: formData.specialNeeds || undefined,
          emergencyContact: formData.emergencyContact || undefined,
        },
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

  const resetForm = () => {
    setFormData({
      ticketType: "general",
      dietaryRequirements: "",
      specialNeeds: "",
      emergencyContact: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Show sold out state
  if (isSoldOut) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event Sold Out</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-lg font-medium text-red-600">
              Sorry, this event is sold out!
            </p>
            <p className="mt-2 text-sm text-gray-600">
              All {availableSpots + 1} spots have been filled.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show already registered state
  if (userRegistration && userRegistration.status !== "cancelled") {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already Registered</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-lg font-medium text-blue-600">
              You're already registered for this event!
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Registration Status: <span className="font-medium capitalize">{userRegistration.status}</span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Ticket Type: <span className="font-medium capitalize">{userRegistration.ticketType}</span>
            </p>
            {userRegistration.status === "confirmed" && (
              <p className="mt-3 text-sm text-green-600 font-medium">
                Check your email for ticket details or visit your dashboard.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Register for {eventName}
            {availableSpots <= 10 && availableSpots > 0 && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                Only {availableSpots} spots left!
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Ticket Selection */}
          <div>
            <Label className="text-base font-medium mb-4 block">
              Select Your Ticket Type
            </Label>
            <RadioGroup
              value={formData.ticketType}
              onValueChange={(value) => handleInputChange("ticketType", value as "general" | "vip")}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50">
                <RadioGroupItem value="general" id="general" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="general" className="font-medium">
                    General Admission
                  </Label>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ${generalPrice}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Access to main event area, standard seating, and basic amenities.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50">
                <RadioGroupItem value="vip" id="vip" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="vip" className="font-medium">
                    VIP/Premium Ticket
                  </Label>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    ${vipPrice}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {vipPerks}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Event-Specific Information */}
          <div>
            <Label className="text-base font-medium mb-4 block">
              Event Details (Optional)
            </Label>
            <p className="text-sm text-gray-600 mb-4">
              Your name and email will be collected securely during checkout. Please provide any event-specific information below:
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="dietaryRequirements">Dietary Requirements</Label>
                <Textarea
                  id="dietaryRequirements"
                  value={formData.dietaryRequirements}
                  onChange={(e) => handleInputChange("dietaryRequirements", e.target.value)}
                  placeholder="Any dietary restrictions or food allergies? (optional)"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="specialNeeds">Special Accessibility Needs</Label>
                <Textarea
                  id="specialNeeds"
                  value={formData.specialNeeds}
                  onChange={(e) => handleInputChange("specialNeeds", e.target.value)}
                  placeholder="Any accessibility requirements or special accommodations? (optional)"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  placeholder="Emergency contact name and phone (optional)"
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Order Summary</h4>
            <div className="flex justify-between items-center">
              <span>
                {formData.ticketType === "vip" ? "VIP/Premium" : "General"} Ticket
              </span>
              <span className="font-bold">
                ${formData.ticketType === "vip" ? vipPrice : generalPrice}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              You'll provide your personal details securely during checkout
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRegistration}
            disabled={loading || createPaymentSession.isPending || !formData.ticketType}
            className="flex-1"
          >
            {loading || createPaymentSession.isPending
              ? "Processing..."
              : "Proceed to Checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
