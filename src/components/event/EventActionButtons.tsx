"use client";

import { useRouter } from "next/navigation";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";

interface EventActionButtonsProps {
  status: string;
}

export function EventActionButtons({ status }: EventActionButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-4">
      {status === "published" && (
        <InteractiveHoverButton
          text="Register Now"
          className="w-auto bg-blue-600 text-white hover:bg-blue-700"
        />
      )}
      <InteractiveHoverButton
        text="Back to Events"
        className="w-auto border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        onClick={() => router.back()}
      />
    </div>
  );
} 