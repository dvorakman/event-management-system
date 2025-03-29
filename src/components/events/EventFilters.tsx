"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InteractiveHoverButton } from "~/components/ui/interactive-hover-button";

export function EventFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
    location: searchParams.get("location") || "",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    searchTerm: searchParams.get("search") || "",
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    // Only add non-empty values to URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });

    // Update URL with filters
    router.push(`/events?${params.toString()}`);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      type: "",
      location: "",
      startDate: "",
      endDate: "",
      minPrice: "",
      maxPrice: "",
      searchTerm: "",
    });
    router.push("/events");
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Search Term */}
        <div className="col-span-full">
          <input
            type="text"
            name="searchTerm"
            placeholder="Search events..."
            value={filters.searchTerm}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        {/* Event Type */}
        <div>
          <select
            name="type"
            value={filters.type}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          >
            <option value="">All Event Types</option>
            <option value="conference">Conference</option>
            <option value="concert">Concert</option>
            <option value="workshop">Workshop</option>
            <option value="networking">Networking</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={filters.location}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <input
            type="number"
            name="minPrice"
            placeholder="Min Price"
            value={filters.minPrice}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="Max Price"
            value={filters.maxPrice}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        {/* Filter Actions */}
        <div className="col-span-full flex justify-end space-x-4">
          <InteractiveHoverButton
            text="Reset"
            onClick={resetFilters}
            className="w-auto border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          />
          <InteractiveHoverButton
            text="Apply Filters"
            onClick={applyFilters}
            className="w-auto bg-blue-600 text-white hover:bg-blue-700"
          />
        </div>
      </div>
    </div>
  );
} 