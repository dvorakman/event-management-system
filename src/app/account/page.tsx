"use client";

import { UserProfile, SignInButton, useUser, UserButton } from "@clerk/nextjs";
import { useEffect } from "react";
import Link from "next/link";

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  
  console.log("Clerk Auth state:", { 
    isLoaded,
    isSignedIn,
    user: user ? { id: user.id, email: user.primaryEmailAddress?.emailAddress } : null
  });

  // Handle auth loading state
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-lg text-gray-600">Loading auth state...</p>
        </div>
      </div>
    );
  }

  // Handle not signed in state
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Please sign in to view your account.</p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // User is authenticated, show their profile
  return (
    <main className="container mx-auto py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Account</h1>
        <UserButton />
      </div>
      
      <div className="grid gap-8 md:grid-cols-[1fr,2fr]">
        {/* User Info */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Your Profile</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user.fullName || user.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Actions</h2>
            <div className="space-y-4">
              <Link 
                href="/events"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Browse Events
              </Link>
            </div>
          </div>
        </div>

        {/* Clerk User Profile */}
        <div className="rounded-lg border bg-card">
          <UserProfile 
            appearance={{
              elements: {
                rootBox: {
                  boxShadow: "none",
                  width: "100%"
                },
                card: {
                  border: "none",
                  boxShadow: "none",
                  width: "100%"
                }
              }
            }}
          />
        </div>
      </div>
    </main>
  );
} 