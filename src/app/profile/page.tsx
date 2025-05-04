import React from 'react';
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
import { UserProfile } from '@clerk/nextjs';
import { CustomProfileForm } from '~/components/profile/CustomProfileForm';
import { Separator } from '~/components/ui/separator';

export default async function ProfilePage() {
  const user = await currentUser();
  const userId = user?.id;

  return (
    <div className="container mx-auto flex flex-col items-center justify-start px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">My Profile</h1>

      {/* Custom profile sections first */}
      <CustomProfileForm />
      
      <Separator className="my-8" />

      {/* Clerk's UserProfile Component for core account management */}
      <h2 className="mb-4 text-2xl font-semibold">Account Settings</h2>
      <UserProfile 
        path="/profile"
        routing="path" 
        appearance={{
          elements: {
            card: "shadow-none w-full max-w-lg",
            pageScrollBox: "w-full",
            navbar: "hidden",
            headerTitle: "hidden",
            profileSection__activeDevices: "hidden",
            profileSection__connectedAccounts: "w-full",
            profileSection__security: "w-full",
          }
        }}
      />

      {/* Custom profile sections will go below */}
      {userId ? (
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <p className="mb-4">
            <strong>User ID:</strong> {userId}
          </p>
          <p className="mb-4">
            <strong>Name:</strong> {user?.firstName} {user?.lastName}
          </p>
          <p className="mb-4">
            <strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}
          </p>

          <div className="mt-6">
            <Link href="/" className="inline-block">
              <InteractiveHoverButton
                text="Back to Home"
                className="w-auto bg-blue-600 text-white hover:bg-blue-700"
              />
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <p className="mb-4">You are not signed in.</p>
          <div className="mt-6">
            <Link href="/sign-in" className="inline-block">
              <InteractiveHoverButton
                text="Sign In"
                className="w-auto bg-blue-600 text-white hover:bg-blue-700"
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
