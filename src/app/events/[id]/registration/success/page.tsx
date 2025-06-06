"use client";

import dynamic from "next/dynamic";
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

type Props = {
  params: Promise<{ id: string }> | { id: string };
  searchParams:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
};

export default function RegistrationSuccessPage({
  params,
  searchParams,
}: Props) {
  // Safely unwrap the params and searchParams (they might or might not be promises)
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const resolvedSearchParams =
    searchParams instanceof Promise ? use(searchParams) : searchParams;

  // Extract session_id from search params
  const sessionId =
    typeof resolvedSearchParams.session_id === "string"
      ? resolvedSearchParams.session_id
      : null;

  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessPageContent eventId={resolvedParams.id} sessionId={sessionId} />
    </Suspense>
  );
}

function SuccessPageContent({
  eventId,
  sessionId,
}: {
  eventId: string;
  sessionId: string | null;
}) {
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
  return <PaymentVerification eventId={eventId} sessionId={sessionId} />;
}
