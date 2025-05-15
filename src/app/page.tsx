import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import type { COBEOptions } from "cobe";

// import { HydrateClient } from "~/trpc/server"; // Keep if still needed, else remove. Was in original, removed in previous step.
import { Button } from "~/components/ui/button"; // Your existing Button component
import { Globe } from "~/components/ui/globe"; // Uncommented Globe import
// import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
// import { BackgroundGradient } from "~/components/ui/background-gradient"; // Was in original, can be added back if needed for event cards etc.
// import { BackgroundBoxes } from "~/components/ui/background-boxes";

// Define the custom globe configuration for neon orange
const neonOrangeGlobeConfig: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1, // Keep dark mode for the globe body, good for neon glow
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2, // This can be adjusted if the orange needs more pop
  baseColor: [1, 0.6, 0], // Neon Orange (derived from #ff9900)
  markerColor: [1, 1, 1], // White markers for contrast
  glowColor: [1, 0.6, 0], // Neon Orange for the glow
  markers: [
    // Keeping the default markers
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
  // onRender is managed by the Globe component itself
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Removed Header from example, as a global header already exists */}

      {/* Hero Section from example */}
      <section className="bg-background py-16">
        {/* Modified container to be a flex container for side-by-side layout on md+ screens */}
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 px-4 md:flex-row md:gap-12">
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

          {/* Globe component wrapper */}
          {/* The Globe component uses absolute positioning internally, so its container needs a defined size or to be part of the flex flow */}
          {/* Adding min-h-[300px] or similar might be needed depending on how Globe sizes itself within a flex item */}
          <div className="relative flex h-auto min-h-[300px] w-full items-center justify-center md:min-h-[400px] md:w-1/2">
            <Globe className="top-0" config={neonOrangeGlobeConfig} />
            {/* Adjust className for Globe if needed, e.g. to control its max-width or positioning if the default isn't ideal in flex */}
          </div>
        </div>
      </section>

      {/* Browse and Start New Events from example */}
      <section className="bg-background py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-bold">
            Browse and start new events
          </h2>
          <p className="mb-8 text-muted-foreground">
            Find the perfect event for you or create your own
          </p>

          <div className="mb-12 flex space-x-4">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90">
              All
            </Button>
            <Button
              variant="outline"
              className="border-border text-muted-foreground"
            >
              Music
            </Button>
            <Button
              variant="outline"
              className="border-border text-muted-foreground"
            >
              Tech
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Our Platform - adapted from your original content and example style */}
      <section className="bg-gradient-to-b from-[#0f172a] to-background py-16">
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
                  className="border-primary-foreground px-8 py-3 text-lg text-primary-foreground hover:bg-black/10"
                >
                  Get Started
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  className="border-primary-foreground px-8 py-3 text-lg text-primary-foreground hover:bg-black/10"
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
