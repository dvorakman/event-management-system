import { redirect } from "next/navigation";
import { BecomeOrganizerForm } from "~/app/_components/BecomeOrganizerForm";
import { api } from "~/trpc/server";

export default async function BecomeOrganizerPage() {
  // Check if user is already an organizer
  const user = await api.user.getCurrentUser.query();
  
  if (user.role === "organizer" || user.role === "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="container mx-auto max-w-2xl py-16">
      <div className="rounded-lg border bg-card p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Become an Organizer</h1>
          <p className="text-muted-foreground">
            Fill out the form below to become an event organizer. Once approved,
            you'll be able to create and manage events on our platform.
          </p>
        </div>

        <BecomeOrganizerForm />
      </div>
    </main>
  );
} 