# Changelog

## [2024-03-19] - Database Integration & Test Data Generation

### Added
- **`scripts/generate-test-data.ts`**: New script to generate test data for the database
  - Generates organizers, users, events, registrations, tickets, and notifications
  - Configurable number of records for each entity
  - Creates realistic data using Faker.js

### Changed
- **`src/server/api/routers/event.ts`**: Replaced mock data with real database integration
  - Updated searchEvents procedure to use database queries
  - Added proper filtering with SQL conditions
  - Implemented proper price comparison with DECIMAL casting
  - Added proper pagination and sorting
  - Added compatibility layer for frontend data structure

- **`src/app/events/_components/EventCard.tsx`**: Updated to match database schema
  - Modified props interface to match database fields
  - Added proper price formatting
  - Added description truncation
  - Improved image handling
  - Added better date formatting

### Modified
- **`package.json`**: Added new script command
  - Added `db:generate-test-data` command to run the test data generator

## [YYYY-MM-DD] - Event Discovery Feature (Initial Implementation)

### Added

-   **`src/server/api/routers/event.ts`**: New tRPC router for event-related procedures (`searchEvents`, `getEventById`). Includes Zod schemas for input validation and output types, and mock data/logic.
-   **`src/app/events/page.tsx`**: New frontend page for browsing and searching events. Includes basic UI placeholders and uses `api.event.searchEvents` hook.
-   **`src/app/events/[id]/page.tsx`**: New frontend page for viewing event details. Uses route parameters and the `api.event.getEventById` hook.
-   **`changelog.md`**: This file to track changes.

### Changed

-   **`src/server/api/root.ts`**: (Verification Step) Confirmed that `eventRouter` is imported and included in the `appRouter`. No code changes were needed as it was already present.

## [YYYY-MM-DD] - Refactor Event Browsing & Fix Errors

### Changed

-   **`src/server/api/routers/event.ts`**:
    -   Made the input for the `searchEvents` procedure optional (`.input(... .optional())`) to handle server-side rendering calls without explicit input.
    -   Added internal default value handling for search/pagination parameters within the `searchEvents` query when input is missing.
    -   Added type annotations within mock data filtering/finding logic to satisfy the linter.
-   **`src/app/events/page.tsx`**:
    -   Replaced the previous Server Component structure with a Client Component (`"use client"`).
    -   Implemented event searching/browsing using the `api.event.searchEvents.useQuery` hook.
    -   Added state management (`useState`) for filters and pagination.
    -   Included inline components (`EventCard`, `SearchFilters`, `PaginationControls`) for UI elements.
    -   Refined TypeScript types (`EventCategory`, `EventFilters`) for component props and state to align with backend Zod schema, resolving type errors related to the category enum.
    -   Removed the second options argument (containing `keepPreviousData`/`placeholderData`) from `useQuery` hook to resolve persistent type errors/compatibility issues.

## [Unreleased]

### Changed
- Updated event categories to ["conference", "music_concert", "networking"]
- Modified test data generation to ensure at least one event of each category type
- Changed events per page from 10 to 9 in both frontend and backend
  - Updated frontend pagination state default limit
  - Updated backend searchEventsInputSchema default limit
  - This change allows for better grid layout and more pages of content

## [2024-03-19] - Event Page Fixes & Schema Updates

### Changed
- **`src/app/events/[id]/page.tsx`**: Fixed hydration and validation issues
  - Updated Zod schema to handle Date objects directly
  - Moved date formatting outside of JSX to prevent hydration mismatches
  - Improved data validation and error handling
  - Enhanced date display formatting 