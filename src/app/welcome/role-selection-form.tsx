"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

interface RoleSelectionFormProps {
  userId: string;
}

export default function RoleSelectionForm({ userId }: RoleSelectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  
  const handleRoleSelection = async (role: "user" | "organizer") => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    console.log(`Setting role for user ${userId} to: ${role}`);
    
    try {
      // Call our API endpoint to update the user's role
      const response = await fetch("/api/user/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to set role");
      }
      
      console.log("Role set successfully:", data);
      setSuccess(`You've been registered as a${role === "organizer" ? "n organizer" : " user"}.`);
      
      // Short timeout before redirect to show success message
      setTimeout(() => {
        // Redirect to the appropriate dashboard based on role
        const redirectUrl = role === "organizer" ? "/organizer/dashboard" : "/dashboard";
        console.log(`Redirecting user to ${redirectUrl}`);
        router.push(redirectUrl);
      }, 1500);
    } catch (error) {
      console.error("Error setting role:", error);
      setError(error instanceof Error ? error.message : "Failed to set role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          onClick={() => !isLoading && handleRoleSelection("user")} 
          className={`p-6 cursor-pointer border-2 hover:border-blue-500 hover:shadow-md transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">I'm an Attendee</h3>
            <p className="text-sm text-gray-600">
              I want to discover and register for events
            </p>
          </div>
        </Card>
        
        <Card 
          onClick={() => !isLoading && handleRoleSelection("organizer")} 
          className={`p-6 cursor-pointer border-2 hover:border-blue-500 hover:shadow-md transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">I'm an Organizer</h3>
            <p className="text-sm text-gray-600">
              I want to create and manage events
            </p>
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