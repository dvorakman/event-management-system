'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch'; // Assuming you have a Switch component
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';

// Define the structure of your custom metadata
interface CustomPublicMetadata {
  displayName?: string;
  allowMarketingEmails?: boolean;
  // Add other preferences here
}

export function CustomProfileForm() {
  const { user } = useUser();
  const [displayName, setDisplayName] = useState('');
  const [allowMarketingEmails, setAllowMarketingEmails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load initial data from user metadata
  useEffect(() => {
    if (user?.publicMetadata) {
      const metadata = user.publicMetadata as CustomPublicMetadata;
      setDisplayName(metadata.displayName || user.fullName || '');
      setAllowMarketingEmails(metadata.allowMarketingEmails || false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await user.update({
        publicMetadata: {
          ...(user.publicMetadata as CustomPublicMetadata), // Preserve existing metadata
          displayName: displayName,
          allowMarketingEmails: allowMarketingEmails,
          // Update other preferences here
        },
      });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
      // Optionally clear success/error messages after a delay
      setTimeout(() => {
          setSuccess(null);
          setError(null);
      }, 3000);
    }
  };

  if (!user) {
    return <div>Loading user data...</div>; // Or a loading spinner
  }

  return (
    <Card className="w-full max-w-lg mt-8">
      <CardHeader>
        <CardTitle>Custom Profile Settings</CardTitle>
        <CardDescription>Manage your application-specific profile details.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you appear to others"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="allowMarketingEmails"
              checked={allowMarketingEmails}
              onCheckedChange={setAllowMarketingEmails}
              disabled={isLoading}
            />
            <Label htmlFor="allowMarketingEmails">Receive marketing emails</Label>
          </div>
          {/* Add inputs for other preferences here */}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 