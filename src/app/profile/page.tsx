import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";

export default async function ProfilePage() {
  const user = await currentUser();
  const userId = user?.id;

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-6 text-2xl font-bold">Your Profile</h1>

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
