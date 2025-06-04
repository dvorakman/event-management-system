"use client"; // Needed for hooks like useState and tRPC's useQuery

import React, { useState } from 'react';
import { api } from "~/trpc/react"; // Ensure this path is correct for your tRPC client setup
import Link from 'next/link';
import { z } from 'zod'; // Import Zod
import { format } from 'date-fns';
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

// Define category type based on the backend schema
const categorySchema = z.enum(["conference", "music_concert", "networking"]);
type Category = z.infer<typeof categorySchema>;

// Define event type based on the schema
const eventSchema = z.object({
  id: z.number(),
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
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<Category | undefined>(undefined);
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [location, setLocation] = useState('');
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
            <h2 className="mb-4 text-xl font-semibold text-white">Search & Filter Events</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <Label htmlFor="search" className="text-white">Search Keywords</Label>
                        <Input
                            id="search"
                            placeholder="Search by keyword..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="bg-gray-700 text-white border-gray-600"
                        />
                    </div>
                    <div>
                        <Label htmlFor="category" className="text-white">Category</Label>
                        <Select value={category ?? ''} onValueChange={(value) => setCategory(value as Category || undefined)}>
                            <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Categories</SelectItem>
                                <SelectItem value="conference">Conference</SelectItem>
                                <SelectItem value="music_concert">Music Concert</SelectItem>
                                <SelectItem value="networking">Networking Session</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="location" className="text-white">Location</Label>
                        <Input
                            id="location"
                            placeholder="Location..."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="bg-gray-700 text-white border-gray-600"
                        />
                    </div>
                    <div>
                        <Label htmlFor="dateFrom" className="text-white">From Date</Label>
                        <Input
                            id="dateFrom"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-gray-700 text-white border-gray-600"
                        />
                    </div>
                    <div>
                        <Label htmlFor="dateTo" className="text-white">To Date</Label>
                        <Input
                            id="dateTo"
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-gray-700 text-white border-gray-600"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label htmlFor="priceMin" className="text-white">Min Price</Label>
                            <Input
                                id="priceMin"
                                type="number"
                                placeholder="Min Price"
                                value={priceMin ?? ''}
                                onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                                className="bg-gray-700 text-white border-gray-600"
                            />
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="priceMax" className="text-white">Max Price</Label>
                            <Input
                                id="priceMax"
                                type="number"
                                placeholder="Max Price"
                                value={priceMax ?? ''}
                                onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                                className="bg-gray-700 text-white border-gray-600"
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

// Pagination controls component
function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    return (
        <div className="flex justify-center gap-2 mt-8">
            <Button
                variant="outline"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                Previous
            </Button>
            <span className="flex items-center px-4 text-white">
                Page {currentPage} of {totalPages}
            </span>
            <Button
                variant="outline"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next
            </Button>
        </div>
    );
}

// Event card component
function EventCard({ event }: { event: any }) {
    const formattedDate = format(new Date(event.startDate), 'PPP p');
    const formattedPrice = `$${Number(event.generalTicketPrice).toFixed(2)}`;

    return (
        <div className="rounded-lg bg-gray-800 p-6 shadow-md border border-gray-700">
            <div className="mb-3">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                    {event.type.replace('_', ' ')}
                </span>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">{event.name}</h3>
            <p className="mb-4 text-gray-300 line-clamp-3">{event.description}</p>
            <div className="mb-4 space-y-2 text-sm text-gray-400">
                <p>📅 {formattedDate}</p>
                <p>📍 {event.location}</p>
                <p>💰 From {formattedPrice}</p>
                <p>👥 Max {event.maxAttendees} attendees</p>
            </div>
            <Link href={`/events/${event.id}`}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    View Details
                </Button>
            </Link>
        </div>
    );
}

// Loading component
function LoadingGrid() {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg bg-gray-800 p-6 shadow-md border border-gray-700">
                    <Skeleton className="h-6 w-20 mb-3 bg-gray-700" />
                    <Skeleton className="h-8 w-3/4 mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-2/3 mb-4 bg-gray-700" />
                    <div className="space-y-2 mb-4">
                        <Skeleton className="h-4 w-1/2 bg-gray-700" />
                        <Skeleton className="h-4 w-1/3 bg-gray-700" />
                        <Skeleton className="h-4 w-1/4 bg-gray-700" />
                    </div>
                    <Skeleton className="h-10 w-full bg-gray-700" />
                </div>
            ))}
        </div>
    );
}

// Main component
export default function EventsPage() {
    const [filters, setFilters] = useState<EventFilters>({});
    const [currentPage, setCurrentPage] = useState(1);

    // Use the searchEvents API from the SCRUM-276 branch
    const { data: searchResults, isLoading, error } = api.event.searchEvents.useQuery({
        ...filters,
        page: currentPage,
        limit: 9,
    });

    const handleSearch = (newFilters: EventFilters) => {
        setFilters(newFilters);
        setCurrentPage(1); // Reset to first page when searching
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg bg-red-100 p-6 text-center">
                    <h2 className="text-xl font-semibold text-red-800">Error Loading Events</h2>
                    <p className="mt-2 text-red-600">{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <h1 className="mb-8 text-4xl font-bold text-white">Discover Events</h1>
                
                <SearchFilters onSearch={handleSearch} />

                {isLoading ? (
                    <LoadingGrid />
                ) : searchResults && searchResults.events.length > 0 ? (
                    <>
                        <div className="mb-6 text-gray-300">
                            Found {searchResults.totalEvents} events
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {searchResults.events.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                        {searchResults.totalPages > 1 && (
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={searchResults.totalPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </>
                ) : (
                    <div className="rounded-lg bg-gray-800 p-8 text-center">
                        <h2 className="text-xl font-semibold text-white">No events found</h2>
                        <p className="mt-2 text-gray-400">
                            Try adjusting your search criteria or check back later for new events.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
