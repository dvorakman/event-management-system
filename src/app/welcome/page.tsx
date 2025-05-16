import { type Metadata } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { redirect } from "next/navigation";
import RoleSelectionForm from "./role-selection-form";

export const metadata: Metadata = {
  title: "Welcome - Select Your Role",
  description: "Complete your profile by selecting your role",
};

export default async function WelcomePage() {
  // Get the current user and session
  const { userId, sessionClaims } = getAuth();
  
  // If user is not authenticated, redirect to sign-in
  if (!userId) {
    redirect("/sign-in");
  }
  
  // Initialize Clerk client with secret key
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  
  // Fetch user details from Clerk
  const user = await clerk.users.getUser(userId);
  
  // Check for role in various possible places
  const publicMetadata = user.publicMetadata || {};
  const userRole = 
    sessionClaims?.role || 
    publicMetadata.role as string || 
    null;
  
  console.log("Welcome page - User info:", { 
    userId, 
    email: user.emailAddresses[0]?.emailAddress,
    role: userRole,
    sessionClaimsRole: sessionClaims?.role,
    publicMetadataRole: publicMetadata.role,
  });
  
  // If user already has a role, redirect them to the appropriate dashboard
  if (userRole === "organizer") {
    console.log(`User ${userId} is already an organizer, redirecting to organizer dashboard`);
    redirect("/organizer/dashboard");
  } else if (userRole === "user") {
    console.log(`User ${userId} is already a regular user, redirecting to dashboard`);
    redirect("/dashboard");
  }
  
  console.log(`User ${userId} has no role set, showing role selection form`);
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Event Management System!</h1>
          <p className="mt-2 text-gray-600">
            How will you be using our platform? Please select your role below.
          </p>
        </div>
        
        <RoleSelectionForm userId={userId} />
      </div>
    </div>
  );
} 