"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { RegistrationModal } from "./RegistrationModal";

interface EventActionButtonsProps {
  status: string;
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

export function EventActionButtons({
  status,
  eventId,
  eventName,
  generalPrice,
  vipPrice,
  vipPerks,
  isSoldOut = false,
  availableSpots = 0,
  userRegistration = null,
}: EventActionButtonsProps) {
  const router = useRouter();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Determine button state based on user registration
  const getRegistrationButtonContent = () => {
    if (isSoldOut) return { text: "Sold Out", disabled: true, variant: "default" as const };
    
    if (userRegistration) {
      switch (userRegistration.status) {
        case "confirmed":
          return { 
            text: `Already Registered (${userRegistration.ticketType})`, 
            disabled: true, 
            variant: "secondary" as const 
          };
        case "pending":
          return { 
            text: "Registration Pending", 
            disabled: true, 
            variant: "secondary" as const 
          };
        case "cancelled":
          return { 
            text: "Register Now", 
            disabled: false, 
            variant: "default" as const 
          };
        default:
          return { 
            text: "Already Registered", 
            disabled: true, 
            variant: "secondary" as const 
          };
      }
    }
    
    return { text: "Register Now", disabled: false, variant: "default" as const };
  };

  const buttonConfig = getRegistrationButtonContent();

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {status === "published" && (
          <Button
            variant={buttonConfig.variant}
            onClick={() => setShowRegistrationModal(true)}
            disabled={buttonConfig.disabled}
          >
            {buttonConfig.text}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back to Events
        </Button>
      </div>

      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        eventId={eventId}
        eventName={eventName}
        generalPrice={generalPrice}
        vipPrice={vipPrice}
        vipPerks={vipPerks}
        isSoldOut={isSoldOut}
        availableSpots={availableSpots}
        userRegistration={userRegistration}
      />
    </>
  );
} 