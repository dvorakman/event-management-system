import { type Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import RoleSelectionForm from "./role-selection-form";

export const metadata: Metadata = {
  title: "Complete Your Onboarding",
  description: "Complete your profile by selecting your role",
};

export default async function OnboardingPage() {
  // Get the current user using currentUser() which directly queries Clerk API
  const user = await currentUser();
  
  // If user is not authenticated, redirect to sign-in
  if (!user) {
    redirect("/sign-in");
  }
  
  // Extract user information from Clerk API - this is more reliable than JWT claims
  const userId = user.id;
  const metadata = user.publicMetadata;
  const role = metadata.role as string || null;
  const onboardingComplete = metadata.onboardingComplete as boolean || false;
  
  console.log("Onboarding page - User info from Clerk API:", { 
    userId, 
    email: user.emailAddresses[0]?.emailAddress,
    role,
    onboardingComplete,
  });
  
  // If onboarding is complete according to Clerk API, redirect to appropriate dashboard
  if (onboardingComplete && role) {
    if (role === "organizer") {
      console.log(`User ${userId} has completed onboarding as organizer, redirecting to organizer dashboard`);
      redirect("/organizer/dashboard");
    } else if (role === "user") {
      console.log(`User ${userId} has completed onboarding as regular user, redirecting to dashboard`);
      redirect("/dashboard");
    }
  }
  
  console.log(`User ${userId} needs to complete onboarding, showing role selection form`);
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Onboarding</h1>
          <p className="mt-2 text-gray-600">
            How will you be using our platform? Please select your role below.
          </p>
        </div>
        
        <RoleSelectionForm userId={userId} />
      </div>
    </div>
  );
} 