"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";

// Loading component shown during event data fetch
function EventsLoading() {
  // Generate items with unique IDs for keys
  const skeletonItems = Array.from({ length: 6 }, (_, i) => ({
    id: `loading-event-skeleton-${i}`,
  }));
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {skeletonItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
          >
            <Skeleton className="mb-4 h-6 w-3/4" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-4 h-4 w-2/3" />
            <Skeleton className="mt-auto h-10 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Component to display events with filtering
function EventsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get filter values from URL
  const typeFilter = searchParams.get("type") ?? "";
  const searchQuery = searchParams.get("search") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const cursor = searchParams.get("cursor") ?? undefined;

  // Local state for filter inputs
  const [type, setType] = useState(typeFilter);
  const [search, setSearch] = useState(searchQuery);
  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);

  // Fetch events with current filters
  const { data: eventsData, isLoading } = api.event.list.useQuery(
    {
      limit: 10,
      cursor: cursor ? Number.parseInt(cursor) : undefined,
      type:
        typeFilter && typeFilter !== "all"
          ? (typeFilter as
              | "conference"
              | "concert"
              | "workshop"
              | "networking"
              | "other")
          : undefined,
      search: searchQuery ?? undefined,
      minPrice: priceMin ? Number.parseFloat(priceMin) : undefined,
      maxPrice: priceMax ? Number.parseFloat(priceMax) : undefined,
    },
    {
      enabled: true,
    },
  );

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type && type !== "all") params.set("type", type);
    if (search) params.set("search", search);
    if (priceMin) params.set("minPrice", priceMin);
    if (priceMax) params.set("maxPrice", priceMax);

    router.push(`/events?${params.toString()}`);
  };

  // Clear filters
  const clearFilters = () => {
    setType("all");
    setSearch("");
    setPriceMin("");
    setPriceMax("");
    router.push("/events");
  };

  // Function to format dates for display
  const formatDate = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // No events found state
  if (!isLoading && (!eventsData || eventsData.items.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Events</h1>

        {/* Filter Section */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold">Filter Events</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="concert">Concert</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priceMin">Min Price</Label>
              <Input
                id="priceMin"
                type="number"
                placeholder="Min price"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="priceMax">Max Price</Label>
              <Input
                id="priceMax"
                type="number"
                placeholder="Max price"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={applyFilters}>Apply Filters</Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
          <h2 className="text-xl font-semibold">No events found</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Try adjusting your filters or check back later for upcoming events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Events</h1>

      {/* Filter Section */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold">Filter Events</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="type">Event Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="concert">Concert</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="networking">Networking</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priceMin">Min Price</Label>
            <Input
              id="priceMin"
              type="number"
              placeholder="Min price"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="priceMax">Max Price</Label>
            <Input
              id="priceMax"
              type="number"
              placeholder="Max price"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={applyFilters}>Apply Filters</Button>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Generate items with unique IDs for keys directly in the map chain */}
          {Array.from({ length: 6 }, (_, i) => ({
            id: `loading-data-skeleton-${i}`,
          })).map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
            >
              <Skeleton className="mb-4 h-6 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-2/3" />
              <Skeleton className="mt-auto h-10 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {eventsData?.items.map((event) => (
            <div
              key={event.id}
              className="flex h-full flex-col rounded-3xl border-2 border-primary bg-card p-6"
            >
              <div className="mb-4">
                <p className="font-medium text-primary">{event.type}</p>
              </div>

              <h3 className="mb-3 text-2xl font-bold">{event.name}</h3>

              <p className="mb-6 line-clamp-3 flex-grow text-foreground">
                {event.description}
              </p>

              <div className="mb-8 space-y-2">
                <p className="text-foreground">
                  <span className="font-medium">When:</span>{" "}
                  {formatDate(event.startDate)}
                </p>
                <p className="text-foreground">
                  <span className="font-medium">Where:</span> {event.location}
                </p>
                <p className="text-foreground">
                  <span className="font-medium">Price:</span> $
                  {Number(event.generalTicketPrice).toFixed(2)}
                </p>
              </div>

              <div className="mt-auto">
                <Link href={`/events/${event.id}`}>
                  <Button className="bg-primary font-medium text-primary-foreground hover:bg-[#e68a00]">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {eventsData?.nextCursor && (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/events?cursor=${eventsData.nextCursor}${
              type ? `&type=${type}` : ""
            }${search ? `&search=${search}` : ""}${
              priceMin ? `&minPrice=${priceMin}` : ""
            }${priceMax ? `&maxPrice=${priceMax}` : ""}`}
          >
            <Button variant="outline">Load More</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsList />
    </Suspense>
  );
}
