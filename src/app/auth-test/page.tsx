"use client";

import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { api } from "~/trpc/react";

export default function AuthTestPage() {
  // Get auth state from Clerk
  const { isSignedIn, userId, isLoaded } = useAuth();

  // Call our test procedures
  const publicData = api.authTest.publicTest.useQuery(undefined, {
    retry: false,
  });
  const protectedData = api.authTest.protectedTest.useQuery(undefined, {
    retry: false,
    enabled: isSignedIn, // Only run when signed in
  });
  const authStatus = api.authTest.getAuthStatus.useQuery(undefined, {
    retry: false,
    enabled: isSignedIn, // Only run when signed in
  });

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="container mx-auto p-8">
        <p>Loading auth state...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-3xl font-bold">Auth Test Page</h1>

      {/* Auth Status */}
      <div className="mb-8 rounded-lg bg-gray-100 p-4">
        <h2 className="mb-4 text-xl font-semibold">Auth Status</h2>
        <p>Is Signed In: {isSignedIn ? "Yes" : "No"}</p>
        <p>User ID: {userId ?? "Not signed in"}</p>
        <div className="mt-4">
          {!isSignedIn ? <SignInButton /> : <SignOutButton />}
        </div>
      </div>

      {/* Public Test */}
      <div className="mb-8 rounded-lg bg-green-100 p-4">
        <h2 className="mb-4 text-xl font-semibold">Public Procedure Test</h2>
        {publicData.isLoading ? (
          <p>Loading...</p>
        ) : publicData.error ? (
          <p className="text-red-500">Error: {publicData.error.message}</p>
        ) : (
          <div>
            <p>Message: {publicData.data?.message}</p>
            <p>Timestamp: {publicData.data?.timestamp}</p>
          </div>
        )}
      </div>

      {/* Protected Test */}
      <div className="mb-8 rounded-lg bg-blue-100 p-4">
        <h2 className="mb-4 text-xl font-semibold">Protected Procedure Test</h2>
        {!isSignedIn ? (
          <p>Sign in to test protected routes</p>
        ) : protectedData.isLoading ? (
          <p>Loading...</p>
        ) : protectedData.error ? (
          <p className="text-red-500">
            Error: {protectedData.error.message}
          </p>
        ) : (
          <div>
            <p>Message: {protectedData.data?.message}</p>
            <p>User ID: {protectedData.data?.userId}</p>
            <p>User Email: {protectedData.data?.userEmail}</p>
            <p>Timestamp: {protectedData.data?.timestamp}</p>
          </div>
        )}
      </div>

      {/* Detailed Auth Status */}
      <div className="rounded-lg bg-purple-100 p-4">
        <h2 className="mb-4 text-xl font-semibold">Detailed Auth Status</h2>
        {!isSignedIn ? (
          <p>Sign in to view detailed auth status</p>
        ) : authStatus.isLoading ? (
          <p>Loading...</p>
        ) : authStatus.error ? (
          <p className="text-red-500">
            Error: {authStatus.error.message}
          </p>
        ) : (
          <div>
            <p>Authenticated: {String(authStatus.data?.authenticated)}</p>
            <p>User ID: {authStatus.data?.userId}</p>
            {authStatus.data?.user && (
              <div className="mt-2">
                <p>Email: {authStatus.data.user.email}</p>
                <p>Name: {authStatus.data.user.name}</p>
                <p>
                  Created:{" "}
                  {new Date(authStatus.data.user.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 