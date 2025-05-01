import { redirect } from "next/navigation";
import { BecomeOrganizerForm } from "~/app/_components/BecomeOrganizerForm";
import { api } from "~/trpc/server";
import { currentUser } from "@clerk/nextjs/server";

export default async function BecomeOrganizerPage() {
  // Check if the user is authenticated - use currentUser which returns the full user
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?redirect_url=/become-organizer");
  }

  try {
    // Check if user is already an organizer
    const dbUser = await api.user.getCurrentUser();

    if (dbUser?.role === "organizer" || dbUser?.role === "admin") {
      redirect("/dashboard");
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    // Continue to the form anyway
  }

  return (
    <main className="container mx-auto max-w-2xl py-16">
      <div className="rounded-lg border bg-card p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Become an Organizer</h1>
          <p className="text-muted-foreground">
            Fill out the form below to become an event organizer. Once approved,
            you&apos;ll be able to create and manage events on our platform.
          </p>
        </div>

        <BecomeOrganizerForm />
      </div>
    </main>
  );
}
