"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/hooks/use-toast";

export function BecomeOrganizerForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const becomeOrganizerMutation = api.user.becomeOrganizer.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You are now an organizer. You can start creating events.",
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const organizerName = formData.get("organizerName") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const organizationName = formData.get("organizationName") as string;

    becomeOrganizerMutation.mutate({
      organizerName,
      phoneNumber,
      organizationName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="organizerName">Full Name</Label>
        <Input
          id="organizerName"
          name="organizerName"
          required
          minLength={2}
          placeholder="Enter your full name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          minLength={8}
          placeholder="Enter your phone number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name (Optional)</Label>
        <Input
          id="organizationName"
          name="organizationName"
          placeholder="Enter your organization name"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Processing..." : "Become an Organizer"}
      </Button>

      <p className="text-sm text-gray-500">
        By becoming an organizer, you&apos;ll be able to create and manage
        events on our platform.
      </p>
    </form>
  );
}
