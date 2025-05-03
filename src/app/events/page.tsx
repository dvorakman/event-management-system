"use client"; // Needed for hooks like useState and tRPC's useQuery

import React, { useState } from 'react';
import { api } from "~/trpc/react"; // Ensure this path is correct for your tRPC client setup
import Link from 'next/link';
import { z } from 'zod'; // Import Zod
import { format } from 'date-fns';
import { db } from "~/server/db";
import { events } from "~/server/db/schema";
import { eq, and, or, like, sql } from "drizzle-orm";

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
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <input
                    type="text"
                    placeholder="Search by keyword..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
                />
                <select
                    value={category ?? ''}
                    onChange={(e) => setCategory(e.target.value as Category || undefined)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
          >
                    <option value="">All Categories</option>
                    <option value="conference">Conference</option>
                    <option value="music_concert">Music Concert</option>
                    <option value="networking">Networking Session</option>
                </select>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
                />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
                />
                <input
                    type="number"
                    placeholder="Min Price"
                    value={priceMin ?? ''}
                    onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
                />
                <input
                    type="number"
                    placeholder="Max Price"
                    value={priceMax ?? ''}
                    onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                    style={{ padding: '8px', flex: '1 1 200px' }}
                />
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Search
                </button>
            </div>
        </form>
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '8px 16px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
            >
                Previous
            </button>
            <span style={{ padding: '8px 16px' }}>
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: '8px 16px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
            >
                Next
            </button>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-900">{event.name}</h3>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
              {event.type.replace("_", " ")}
            </span>
          </div>
          <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                {format(event.startDate, "MMM d, yyyy")}
              </p>
              <p className="text-sm text-gray-500">{event.location}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                From ${event.generalTicketPrice}
              </p>
              <p className="text-sm text-gray-500">per ticket</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventsPage() {
    const [filters, setFilters] = useState<EventFilters>({});
    const [pagination, setPagination] = useState({ page: 1, limit: 9 });

    const { data, isLoading, error } = api.event.searchEvents.useQuery(
        {
            ...filters,
            page: pagination.page,
            limit: pagination.limit,
            sortBy: 'date',
            sortOrder: 'asc',
        }
    );

    const handleSearch = (newFilters: EventFilters) => {
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

  return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <h1 style={{ marginBottom: '20px' }}>Discover Events</h1>

            <SearchFilters onSearch={handleSearch} />

            {isLoading && <p>Loading events...</p>}
            {error && <p>Error loading events: {error.message}</p>}

            {data && data.events && (
                <>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '20px',
                        marginBottom: '20px'
                    }}>
                        {data.events.length > 0 ? (
                            data.events.map((event) => (
                                <EventCard key={event.id} event={{
                                    ...event,
                                    startDate: new Date(event.startDate),
                                    endDate: new Date(event.endDate),
                                    date: new Date(event.startDate),
                                }} />
                            ))
                        ) : (
                            <p>No events found matching your criteria.</p>
                        )}
                    </div>

                    {data.totalPages > 1 && (
                        <PaginationControls
                            currentPage={data.currentPage}
                            totalPages={data.totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            )}
        </div>
  );
}
