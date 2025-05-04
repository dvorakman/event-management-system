"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";

// Dynamically import the component only when needed with suspense
const PaymentVerification = dynamic(() => import("./PaymentVerification"), {
  ssr: false,
  loading: () => <LoadingState />,
});

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-lg text-gray-600">Loading payment verification...</p>
      </div>
    </div>
  );
}

export default function RegistrationSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>; // params is a Promise
}) {
  // Unwrap the params promise
  const resolvedParams = use(params);

  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Only render the component if there's a session ID
  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-yellow-800">
            Invalid Registration
          </h2>
          <p className="text-yellow-600">No payment session found.</p>
        </div>
      </div>
    );
  }

  // Only render when we have a session ID
  return (
    <Suspense fallback={<LoadingState />}>
      {/* Use the resolved params */}
      <PaymentVerification eventId={resolvedParams.id} />
    </Suspense>
  );
}
