"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { RegistrationModal } from "./RegistrationModal";

interface EventActionButtonsProps {
  status: string;
  eventId: number;
  eventName: string;
  generalPrice: number;
  vipPrice: number;
  vipPerks: string;
}

export function EventActionButtons({
  status,
  eventId,
  eventName,
  generalPrice,
  vipPrice,
  vipPerks,
}: EventActionButtonsProps) {
  const router = useRouter();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {status === "published" && (
          <Button
            variant="default"
            onClick={() => setShowRegistrationModal(true)}
          >
            Register Now
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
      />
    </>
  );
} 