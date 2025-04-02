import Link from "next/link";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export function BecomeOrganizerButton() {
  const { data: user, isLoading } = api.user.getCurrentUser.useQuery();

  if (isLoading) return null;

  // Don't show the button if user is already an organizer or admin
  if (!user || user.role === "organizer" || user.role === "admin") {
    return null;
  }

  return (
    <Button asChild variant="outline">
      <Link href="/become-organizer" className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
          role="img"
        >
          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
          <path
            fillRule="evenodd"
            d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clipRule="evenodd"
          />
        </svg>
        Become an Organizer
      </Link>
    </Button>
  );
}
