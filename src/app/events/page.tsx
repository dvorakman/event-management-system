"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DateRange, Range, RangeKeyDict } from "react-date-range";
import { addDays, isWithinInterval } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "~/lib/utils";

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
  const locationFilter = searchParams.get("location") ?? "";
  const cursor = searchParams.get("cursor") ?? undefined;

  // Local state for filter inputs
  const [type, setType] = useState(typeFilter);
  const [search, setSearch] = useState(searchQuery);
  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);
  const [location, setLocation] = useState(locationFilter);
  const [dateRange, setDateRange] = useState<Range[]>([
    {
      startDate: undefined,
      endDate: undefined,
      key: "selection",
    },
  ]);

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
      location: locationFilter || undefined,
    },
    {
      enabled: true,
    },
  );

  // Filter events by date range
  const filteredEvents = eventsData?.items.filter((event) => {
    const eventDate = new Date(event.startDate);
    const range = dateRange[0];
    if (!range?.startDate || !range?.endDate) return true;

    // Set end date to end of day (23:59:59)
    const endDate = new Date(range.endDate);
    endDate.setHours(23, 59, 59, 999);

    return isWithinInterval(eventDate, {
      start: range.startDate,
      end: endDate,
    });
  });

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type && type !== "all") params.set("type", type);
    if (search) params.set("search", search);
    if (priceMin) params.set("minPrice", priceMin);
    if (priceMax) params.set("maxPrice", priceMax);
    if (location) params.set("location", location);

    router.push(`/events?${params.toString()}`);
  };

  // Clear filters
  const clearFilters = () => {
    setType("all");
    setSearch("");
    setPriceMin("");
    setPriceMax("");
    setLocation("");
    setDateRange([
      {
        startDate: undefined,
        endDate: undefined,
        key: "selection",
      },
    ]);
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
  if (!isLoading && (!filteredEvents || filteredEvents.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Events</h1>

        {/* Filter Section */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold">Filter Events</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* First Row: Search and Type */}
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
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Second Row: Price Range and Date Range */}
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
            <div>
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange[0]?.startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange[0]?.startDate && dateRange[0]?.endDate ? (
                      <>
                        {formatDate(dateRange[0].startDate)} -{" "}
                        {formatDate(dateRange[0].endDate)}
                      </>
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DateRange
                    editableDateInputs={true}
                    onChange={(ranges: RangeKeyDict) => {
                      if (ranges.selection) {
                        setDateRange([ranges.selection]);
                      }
                    }}
                    moveRangeOnFirstSelection={false}
                    ranges={dateRange}
                  />
                </PopoverContent>
              </Popover>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* First Row: Search and Type */}
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Enter location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Second Row: Price Range and Date Range */}
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
          <div>
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange[0]?.startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange[0]?.startDate && dateRange[0]?.endDate ? (
                    <>
                      {formatDate(dateRange[0].startDate)} -{" "}
                      {formatDate(dateRange[0].endDate)}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DateRange
                  editableDateInputs={true}
                  onChange={(ranges: RangeKeyDict) => {
                    if (ranges.selection) {
                      setDateRange([ranges.selection]);
                    }
                  }}
                  moveRangeOnFirstSelection={false}
                  ranges={dateRange}
                />
              </PopoverContent>
            </Popover>
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents?.map((event) => (
          <div
            key={event.id}
            className="flex flex-col rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
          >
            <h2 className="mb-2 text-xl font-semibold">{event.name}</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              {event.description}
            </p>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Date:</strong> {formatDate(event.startDate)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Location:</strong> {event.location}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Type:</strong> {event.type}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Status:</strong> {event.status}
              </p>
            </div>
            <Link href={`/events/${event.id}`} className="mt-auto inline-block">
              <Button>View Details</Button>
            </Link>
          </div>
        ))}
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
