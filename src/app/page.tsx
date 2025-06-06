"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

import { HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { FeaturedEvents } from "~/components/event/FeaturedEvents";
import dynamic from "next/dynamic";
// import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";
// import { Globe } from "~/components/ui/globe";
// import { BackgroundGradient } from "~/components/ui/background-gradient";
// import { BackgroundBoxes } from "~/components/ui/background-boxes";
import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";

// Lazy load the Globe component
const LandingPageGlobe = dynamic(
  () =>
    import("~/components/ui/LandingPageGlobe").then(
      (mod) => mod.LandingPageGlobe,
    ),
  {
    loading: () => (
      <div className="relative flex h-auto min-h-[300px] w-full items-center justify-center md:min-h-[400px] md:w-1/2">
        <div className="h-32 w-32 animate-pulse rounded-full bg-primary/20" />
      </div>
    ),
    ssr: false,
  },
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

const numberVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 12,
    },
  },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden bg-background">
        <div className="container mx-auto flex h-screen items-center justify-center px-4">
          <div className="flex w-full max-w-7xl flex-col items-center justify-between gap-12 md:flex-row">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="flex-1 space-y-8 text-center md:text-left"
            >
              <h1 className="text-5xl font-bold md:text-6xl lg:text-7xl">
                Discover and Create
                <span className="block text-primary">Unforgettable Events</span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl text-muted-foreground md:mx-0">
                Join our platform to discover amazing events or create your own.
                Connect with people who share your interests.
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:justify-start">
                <SignedIn>
                  <Button asChild size="lg" className="text-lg">
                    <Link href="/events">Browse Events</Link>
                  </Button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button size="lg" className="text-lg">
                      Get Started
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>
            </motion.div>

            {/* Use the lazy loaded Globe component */}
            <LandingPageGlobe className="relative flex h-auto min-h-[400px] w-full items-center justify-center md:min-h-[500px] md:w-1/2" />
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Featured Events
          </h2>
          <FeaturedEvents />
          <div className="mt-12 text-center">
            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Our Platform */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
            className="mb-16 text-center"
          >
            <h2 className="text-2xl font-bold">Why</h2>
            <h2 className="text-2xl font-bold">choose our</h2>
            <h2 className="text-2xl font-bold text-primary">platform?</h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="relative mx-auto max-w-5xl"
          >
            {/* Feature 1 */}
            <motion.div
              variants={itemVariants}
              className="relative mb-24 space-y-4 md:mb-32"
            >
              <motion.div
                variants={numberVariants}
                className="absolute -left-8 -top-8 text-8xl font-bold text-primary md:-left-16 md:-top-16"
              >
                1
              </motion.div>
              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-semibold">Easy Event Creation</h3>
                <p className="text-muted-foreground">
                  Create and manage your events with our intuitive tools. Set up
                  tickets, manage registrations, and track attendance all in one
                  place.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={itemVariants}
              className="relative mb-24 space-y-4 md:mb-32 md:ml-24"
            >
              <motion.div
                variants={numberVariants}
                className="absolute -left-8 -top-8 text-8xl font-bold text-primary md:-left-16 md:-top-16"
              >
                2
              </motion.div>
              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-semibold">Global Reach</h3>
                <p className="text-muted-foreground">
                  Connect with attendees from around the world. Our platform
                  helps you reach a wider audience and grow your event's impact.
                </p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={itemVariants}
              className="relative space-y-4 md:ml-48"
            >
              <motion.div
                variants={numberVariants}
                className="absolute -left-8 -top-8 text-8xl font-bold text-primary md:-left-16 md:-top-16"
              >
                3
              </motion.div>
              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-semibold">Secure Payments</h3>
                <p className="text-muted-foreground">
                  Handle ticket sales and payments securely. Our platform
                  ensures safe transactions for both organizers and attendees.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Become an Organizer Section */}
      <section className="relative min-h-screen bg-primary">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="mb-12"
            >
              <h2 className="text-4xl font-bold text-primary-foreground md:text-6xl lg:text-7xl">
                <TypeAnimation
                  sequence={[
                    "Become an",
                    1000,
                    "Become an organizer",
                    1000,
                    "Become an organizer today",
                    2000,
                  ]}
                  wrapper="span"
                  speed={50}
                  repeat={Infinity}
                  className="block"
                  deletionSpeed={50}
                  cursor={true}
                />
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SignedIn>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="px-12 py-6 text-2xl"
                >
                  <Link href="/organizer/dashboard">Get Started</Link>
                </Button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="px-12 py-6 text-2xl"
                  >
                    Get Started
                  </Button>
                </SignInButton>
              </SignedOut>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
