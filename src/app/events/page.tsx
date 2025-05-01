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
import { CalendarIcon, Loader2 } from "lucide-react";
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

const INITIAL_VISIBLE_COUNT = 6;
const LOAD_MORE_INCREMENT = 6;

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
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const locationFilter = searchParams.get("location") ?? "";
  const startDateFilter = searchParams.get("startDate") ?? "";
  const endDateFilter = searchParams.get("endDate") ?? "";

  // Local state for filter inputs
  const [type, setType] = useState(typeFilter);
  const [search, setSearch] = useState(searchQuery);
  const [priceMax, setPriceMax] = useState(maxPrice);
  const [startDate, setStartDate] = useState<Date | undefined>(
    startDateFilter ? new Date(startDateFilter + "T00:00:00") : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    endDateFilter ? new Date(endDateFilter + "T00:00:00") : undefined,
  );
  const [location, setLocation] = useState(locationFilter);

  // State for managing visible items
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Fetch ALL events using useQuery
  const {
    data: eventsData,
    isLoading,
    error,
  } = api.event.list.useQuery(
    {
      type:
        typeFilter && typeFilter !== "all" ? (typeFilter as any) : undefined,
      search: searchQuery || undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      location: locationFilter || undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [
    typeFilter,
    searchQuery,
    maxPrice,
    locationFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Apply filters by updating URL params
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type && type !== "all") params.set("type", type);
    if (search) params.set("search", search);
    if (priceMax) params.set("maxPrice", priceMax);
    if (location) params.set("location", location);
    if (startDate)
      params.set("startDate", startDate.toISOString().split("T")[0]);
    if (endDate) params.set("endDate", endDate.toISOString().split("T")[0]);

    router.push(`/events?${params.toString()}`);
  };

  // Clear filters by removing URL params
  const clearFilters = () => {
    setType("all");
    setSearch("");
    setPriceMax("");
    setLocation("");
    setStartDate(undefined);
    setEndDate(undefined);
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

  // Handle loading state
  if (isLoading) {
    return <EventsLoading />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-600">
        Error loading events: {error.message}
      </div>
    );
  }

  // Get the items directly from useQuery data
  const allEvents = eventsData?.items ?? [];

  // No events found state
  if (!isLoading && allEvents.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Events</h1>

        {/* Filter Section */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold">Filter Events</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City or venue..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" className="w-full">
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
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="startDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => (endDate ? date > endDate : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="endDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => (startDate ? date < startDate : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="priceMax">Max Price</Label>
              <Input
                id="priceMax"
                type="number"
                placeholder="e.g., 100"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
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

  // Calculate which events to display based on visibleCount
  const visibleEvents = allEvents.slice(0, visibleCount);
  const hasMore = visibleCount < allEvents.length;

  const loadMoreEvents = () => {
    setVisibleCount((prevCount) => prevCount + LOAD_MORE_INCREMENT);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Events</h1>

      {/* Filter Section */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold">Filter Events</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City or venue..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="type">Event Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="w-full">
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
            <Label htmlFor="startDate">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "PPP")
                  ) : (
                    <span>Pick start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => (endDate ? date > endDate : false)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "PPP")
                  ) : (
                    <span>Pick end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => (startDate ? date < startDate : false)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="priceMax">Max Price ($)</Label>
            <Input
              id="priceMax"
              type="number"
              placeholder="e.g., 100"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={applyFilters}>Apply Filters</Button>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleEvents.map((event) => (
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

      {/* Load More Button */}
      <div className="mt-8 flex justify-center">
        {hasMore && (
          <Button variant="outline" onClick={loadMoreEvents}>
            Load More
          </Button>
        )}
        {!hasMore && allEvents.length > INITIAL_VISIBLE_COUNT && (
          <p className="text-center text-gray-500">No more events to load.</p>
        )}
      </div>
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
