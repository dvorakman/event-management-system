import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
// import { HydrateClient } from "~/trpc/server"; // Keep if still needed, else remove. Was in original, removed in previous step.
import { Button } from "~/components/ui/button"; // Your existing Button component
import { LandingPageGlobe } from "~/components/ui/LandingPageGlobe"; // Import the new wrapper component
// import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
// import { BackgroundGradient } from "~/components/ui/background-gradient"; // Was in original, can be added back if needed for event cards etc.
// import { BackgroundBoxes } from "~/components/ui/background-boxes";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Removed Header from example, as a global header already exists */}

      {/* Hero Section from example */}
      <section className="bg-background py-16">
        {/* Modified container to be a flex container for side-by-side layout on md+ screens */}
        <div className="md:gap-15 container mx-auto flex flex-col items-center justify-between gap-8 px-4 md:flex-row">
          {/* Text content wrapper */}
          <div className="flex flex-col justify-center space-y-6 text-center md:w-1/2 md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Discover Amazing Events
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground md:mx-0">
              Find and join events that match your interests, or create your own
              and connect with like-minded people.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
              <Link href="/events">
                <Button className="bg-primary px-8 py-6 text-lg text-primary-foreground hover:bg-[#e68a00]">
                  Find Events
                </Button>
              </Link>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    className="border-border px-8 py-6 text-lg text-foreground hover:bg-border/20"
                  >
                    Create Event
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/become-organizer">
                  <Button
                    variant="outline"
                    className="border-border px-8 py-6 text-lg text-foreground hover:bg-border/20"
                  >
                    Create Event
                  </Button>
                </Link>
              </SignedIn>
            </div>
          </div>

          {/* Use the new LandingPageGlobe component. Pass existing wrapper classes to it. */}
          <LandingPageGlobe className="relative flex h-auto min-h-[300px] w-full items-center justify-center md:min-h-[400px] md:w-1/2" />
        </div>
      </section>

      {/* Why Choose Our Platform - change background to bg-background to match the first section */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold">Why</h2>
            <h2 className="text-2xl font-bold">choose our</h2>
            <h2 className="text-2xl font-bold text-primary">platform?</h2>
          </div>

          <div className="mx-auto max-w-2xl space-y-8">
            <div className="flex items-start space-x-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                1
              </div>
              <div>
                <h3 className="font-bold">Easy event discovery</h3>
                <p className="text-sm text-muted-foreground">
                  Find events that match your interests with our powerful search
                  and filtering tools.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                2
              </div>
              <div>
                <h3 className="font-bold">Seamless registration</h3>
                <p className="text-sm text-muted-foreground">
                  Register for events in seconds and receive digital tickets
                  instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                3
              </div>
              <div>
                <h3 className="font-bold">Powerful Organizer Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage events with ease, track registrations, and
                  communicate with attendees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Become an Organizer from example */}
      <section className="bg-primary py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-foreground">
            Become an
            <br />
            organizer
            <br />
            today
          </h2>
          <div className="mt-6">
            <SignedIn>
              <Link href="/become-organizer">
                <Button
                  variant="outline"
                  className="border-foreground px-8 py-3 text-lg text-foreground hover:bg-foreground/10 hover:text-primary-foreground"
                >
                  Get Started
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  className="border-foreground px-8 py-3 text-lg text-foreground hover:bg-foreground/10 hover:text-primary-foreground"
                >
                  Sign Up to Organize
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </section>

      {/* Footer from example */}
      <footer className="bg-black py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Events</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
