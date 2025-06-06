"use client"; // Needed for hooks like useState and tRPC's useQuery

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
import { z } from "zod";

// Define category type based on the backend schema
const categorySchema = z.enum(["conference", "music_concert", "networking"]);
type Category = z.infer<typeof categorySchema>;

// Define event type based on the schema
const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  location: z.string(),
  type: z.enum(["conference", "music_concert", "networking"]),
  generalTicketPrice: z.string().transform(Number),
  vipTicketPrice: z.string().transform(Number),
  vipPerks: z.string(),
  maxAttendees: z.number(),
  organizerId: z.string(),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
  createdAt: z.string().transform((val) => new Date(val)),
  updatedAt: z.string().transform((val) => new Date(val)),
});

type Event = z.infer<typeof eventSchema>;

// Define a type for the filter state matching the API input expectation
type EventFilters = {
  query?: string;
  category?: Category;
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
  priceMin?: number;
  priceMax?: number;
};

// Search/Filter form component
function SearchFilters({
  onSearch,
}: {
  onSearch: (filters: EventFilters) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [location, setLocation] = useState("");
  const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query: query || undefined,
      category: category || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      location: location || undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
    });
  };

  return (
    <div className="mb-8 rounded-lg bg-gray-800 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Search & Filter Events
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="search" className="text-white">
              Search Keywords
            </Label>
            <Input
              id="search"
              placeholder="Search by keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-gray-600 bg-gray-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-white">
              Category
            </Label>
            <Select
              value={category ?? "all"}
              onValueChange={(value) =>
                setCategory(value === "all" ? undefined : (value as Category))
              }
            >
              <SelectTrigger className="border-gray-600 bg-gray-700 text-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="music_concert">Music Concert</SelectItem>
                <SelectItem value="networking">Networking Session</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="location" className="text-white">
              Location
            </Label>
            <Input
              id="location"
              placeholder="Location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border-gray-600 bg-gray-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="dateFrom" className="text-white">
              From Date
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-gray-600 bg-gray-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-white">
              To Date
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-gray-600 bg-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="priceMin" className="text-white">
                Min Price
              </Label>
              <Input
                id="priceMin"
                type="number"
                placeholder="Min Price"
                value={priceMin ?? ""}
                onChange={(e) =>
                  setPriceMin(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="border-gray-600 bg-gray-700 text-white"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="priceMax" className="text-white">
                Max Price
              </Label>
              <Input
                id="priceMax"
                type="number"
                placeholder="Max Price"
                value={priceMax ?? ""}
                onChange={(e) =>
                  setPriceMax(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="border-gray-600 bg-gray-700 text-white"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Search Events
          </Button>
        </div>
      </form>
    </div>
  );
}

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
      cursor: cursor ? cursor : undefined,
      type:
        typeFilter && typeFilter !== "all"
          ? (typeFilter as "conference" | "music_concert" | "networking")
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

  // Show loading state
  if (isLoading) {
    return <EventsLoading />;
  }

  // No events found state
  if (!isLoading && (!filteredEvents || filteredEvents.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-8 text-3xl font-bold text-white">Events</h1>

          {/* Filter Section */}
          <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Filter Events
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* First Row: Search and Type */}
              <div>
                <Label htmlFor="search" className="text-white">
                  Search
                </Label>
                <Input
                  id="search"
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-gray-600 bg-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="type" className="text-white">
                  Event Type
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger
                    id="type"
                    className="border-gray-600 bg-gray-700 text-white"
                  >
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="music_concert">Music Concert</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location" className="text-white">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Enter location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border-gray-600 bg-gray-700 text-white"
                />
              </div>

              {/* Second Row: Price Range and Date Range */}
              <div>
                <Label htmlFor="priceMin" className="text-white">
                  Min Price
                </Label>
                <Input
                  id="priceMin"
                  type="number"
                  placeholder="Min price"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="border-gray-600 bg-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="priceMax" className="text-white">
                  Max Price
                </Label>
                <Input
                  id="priceMax"
                  type="number"
                  placeholder="Max price"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="border-gray-600 bg-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start border-gray-600 bg-gray-700 text-left font-normal text-white hover:bg-gray-600",
                        !dateRange[0]?.startDate && "text-gray-400",
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

          {/* No Events Message */}
          <div className="py-12 text-center">
            <h3 className="mb-2 text-xl font-semibold text-white">
              No Events Found
            </h3>
            <p className="text-gray-400">
              Try adjusting your filters or check back later for new events.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-white">Events</h1>

        {/* Filter Section */}
        <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-white">
            Filter Events
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* First Row: Search and Type */}
            <div>
              <Label htmlFor="search" className="text-white">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-gray-600 bg-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="type" className="text-white">
                Event Type
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger
                  id="type"
                  className="border-gray-600 bg-gray-700 text-white"
                >
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="music_concert">Music Concert</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location" className="text-white">
                Location
              </Label>
              <Input
                id="location"
                placeholder="Enter location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-gray-600 bg-gray-700 text-white"
              />
            </div>

            {/* Second Row: Price Range and Date Range */}
            <div>
              <Label htmlFor="priceMin" className="text-white">
                Min Price
              </Label>
              <Input
                id="priceMin"
                type="number"
                placeholder="Min price"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="border-gray-600 bg-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="priceMax" className="text-white">
                Max Price
              </Label>
              <Input
                id="priceMax"
                type="number"
                placeholder="Max price"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="border-gray-600 bg-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start border-gray-600 bg-gray-700 text-left font-normal text-white hover:bg-gray-600",
                      !dateRange[0]?.startDate && "text-gray-400",
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
              className="flex flex-col rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-md transition-colors hover:border-gray-600"
            >
              {/* Event Type Badge */}
              <div className="mb-3">
                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium capitalize text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {event.type.replace("_", " ")}
                </span>
              </div>

              {/* Event Title */}
              <h3 className="mb-3 line-clamp-2 text-lg font-semibold text-white">
                {event.name}
              </h3>

              {/* Event Details */}
              <div className="mb-4 space-y-2 text-sm text-gray-300">
                <p className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(event.startDate)}
                </p>
                <p className="flex items-center">📍 {event.location}</p>
                <p className="font-semibold text-green-400">
                  From ${Number(event.generalTicketPrice).toFixed(2)}
                </p>
              </div>

              {/* Event Description */}
              <p className="mb-4 line-clamp-3 flex-grow text-sm text-gray-400">
                {event.description}
              </p>

              {/* View Details Button */}
              <Link href={`/events/${event.id}`}>
                <Button className="mt-auto w-full">View Details</Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Show total count */}
        {filteredEvents && filteredEvents.length > 0 && (
          <div className="mt-8 text-center text-gray-400">
            Showing {filteredEvents.length} event
            {filteredEvents.length !== 1 ? "s" : ""}
          </div>
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
