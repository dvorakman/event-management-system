import { auth, currentUser } from "@clerk/nextjs";
import Link from "next/link";

export default async function ProfilePage() {
  const { userId } = auth();
  const user = await currentUser();

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
            <Link
              href="/"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <p className="mb-4">You are not signed in.</p>
          <div className="mt-6">
            <Link
              href="/sign-in"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
