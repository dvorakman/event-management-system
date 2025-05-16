import { type Metadata } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs";
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
  
  // Fetch user details from Clerk
  const user = await clerkClient.users.getUser(userId);
  
  console.log("Session claims:", sessionClaims); // Debug log
  
  // Check for role in various possible places
  const userRole = 
    sessionClaims?.role || 
    user.publicMetadata?.role as string || 
    null;
  
  console.log("Detected role:", userRole); // Debug log
  
  // If user already has a role, redirect them to the appropriate dashboard
  if (userRole === "organizer") {
    redirect("/organizer/dashboard");
  } else if (userRole === "user") {
    redirect("/dashboard");
  }
  
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