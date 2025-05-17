"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useClerk, useAuth } from "@clerk/nextjs";

interface RoleSelectionFormProps {
  userId: string;
}

export default function RoleSelectionForm({ userId }: RoleSelectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [responseDetails, setResponseDetails] = useState<string | null>(null);
  const router = useRouter();
  const { session } = useAuth();
  const { reloadSession } = useClerk();

  const handleRoleSelection = async (role: "user" | "organizer") => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setResponseDetails(null);
    
    console.log(`Setting role for user ${userId} to: ${role}`);
    
    try {
      // Call our API endpoint to update the user's role
      console.log("Sending request to /api/user/set-role");
      const response = await fetch("/api/user/set-role", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          role,
          onboardingComplete: true // Add onboardingComplete flag
        }),
      });
      
      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Check if the response is JSON
      const contentType = response.headers.get("content-type");
      console.log("Content-Type header:", contentType);
      
      // Try to get the raw response text first for debugging
      const responseText = await response.text();
      console.log("Raw response text:", responseText);
      setResponseDetails(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      
      let data;
      try {
        // Try to parse the response as JSON
        data = JSON.parse(responseText);
        console.log("Parsed JSON data:", data);
      } catch (parseError) {
        console.error("Failed to parse JSON:", parseError);
        throw new Error(`API returned non-JSON response: ${contentType || 'unknown'}`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to set role");
      }
      
      console.log("Role and onboarding status set successfully:", data);
      setSuccess(`You've been registered as a${role === "organizer" ? "n organizer" : " user"}.`);
      
      // Force a session refresh to get the new claims with updated role and onboarding status
      console.log("Forcing session refresh...");
      
      // Perform multiple session reloads with delays to ensure token sync
      try {
        // First reload attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        await reloadSession();
        console.log("First session refresh completed");
        
        // Second reload attempt after short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        await reloadSession();
        console.log("Second session refresh completed");
      } catch (sessionError) {
        console.error("Error refreshing session:", sessionError);
        // Continue anyway since the role was set successfully
      }
      
      // After session refresh, redirect to the appropriate dashboard
      const redirectUrl = role === "organizer" ? "/organizer/dashboard" : "/dashboard";
      console.log(`Redirecting user to ${redirectUrl}`);
      
      router.push(redirectUrl);
      // Force a refresh to ensure the entire app gets the updated session info
      router.refresh();
      
    } catch (error) {
      console.error("Error setting role:", error);
      setError(
        error instanceof Error 
          ? `Failed to set role: ${error.message}` 
          : "Failed to set role. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            {responseDetails && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                <code>{responseDetails}</code>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-2 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium mb-2">I'm an Attendee</h3>
            <p className="text-sm text-gray-600">
              I want to discover and register for events
            </p>
            <Button 
              onClick={() => !isLoading && handleRoleSelection("user")}
              className="w-full"
              disabled={isLoading}
            >
              Select Attendee Role
            </Button>
          </div>
        </Card>
        
        <Card className="p-6 border-2 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium mb-2">I'm an Organizer</h3>
            <p className="text-sm text-gray-600">
              I want to create and manage events
            </p>
            <Button 
              onClick={() => !isLoading && handleRoleSelection("organizer")}
              className="w-full"
              disabled={isLoading}
            >
              Select Organizer Role
            </Button>
          </div>
        </Card>
      </div>
      
      <div className="text-center text-sm text-gray-500 mt-4">
        <p>You can always change your role later by visiting your account settings.</p>
      </div>
      
      {isLoading && (
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
} 