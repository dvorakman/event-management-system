"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Calendar } from "~/components/ui/calendar";
import { cn } from "~/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Skeleton } from "~/components/ui/skeleton";

// Loading component shown during event data fetch
function EventsLoading() {
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
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`loading-card-${index}`}
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
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Fetch events with current filters
  const { data: eventsData, isLoading } = api.event.list.useQuery(
    {
      limit: 100,
      cursor: cursor ? parseInt(cursor) : undefined,
      type:
        typeFilter && typeFilter !== "all" ? (typeFilter as any) : undefined,
      search: searchQuery ?? undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
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
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Location" />
            </div>
            <div>
              <Label htmlFor="date" className="mb-2 block">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
        <div className="grid grid-cols-3">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Location" />
          </div>
          <div>
            <Label htmlFor="date" className="mb-2 block">
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
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
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`loading-card-${index}`}
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
              className="flex flex-col rounded-lg bg-white p-6 shadow-md transition-transform hover:-translate-y-1 dark:bg-gray-800"
            >
              <div className="mb-2 text-sm font-medium uppercase text-blue-600 dark:text-blue-400">
                {event.type}
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {event.name}
              </h2>
              <p className="mb-4 line-clamp-3 flex-grow text-gray-600 dark:text-gray-400">
                {event.description}
              </p>
              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="mr-1 font-medium">When:</span>
                  {formatDate(event.startDate)}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="mr-1 font-medium">Where:</span>
                  {event.location}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="mr-1 font-medium">Price:</span>$
                  {Number(event.generalTicketPrice).toFixed(2)}
                </div>
              </div>
              <div className="mt-auto">
                <Link href={`/events/${event.id}`}>
                  <Button>View Details</Button>
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
