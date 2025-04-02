# Event Management System

A full-stack event management application built with Next.js, tRPC, PostgreSQL, and Clerk authentication. This platform allows users to discover events, register for tickets, and organizers to create and manage events.

## Features

### For Attendees

- Browse and search events by type, date, location, and price
- Register for events with general or VIP ticket options
- Simulate payments for ticket purchases
- View digital tickets with QR codes
- Receive notifications for event updates and confirmations

### For Organizers

- Create and manage events with detailed information
- Track attendee registrations and sales statistics
- Send notifications to registered attendees
- Cancel events with automatic refund simulation
- View analytics on event performance

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui
- **Backend**: tRPC, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **Testing**: Cypress
- **Payment Processing**: Stripe (simulation)
- **Deployment**: Vercel (suggested)

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- Bun (v1.0 or newer)
- PostgreSQL database
- Clerk account for authentication
- Stripe account for payment simulation

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/event_management"
NEON_DATABASE_URL="postgresql://username:password@db.neon.tech/event_management" # If using Neon

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/event-management-system.git
cd event-management-system
```

2. Install dependencies:

```bash
bun install
```

3. Set up the database and run migrations:

```bash
bun db:migrate
```

4. (Optional) Generate test data:

```bash
bun db:generate-test-data
```

5. Start the development server:

```bash
bun dev
```

The application will be available at http://localhost:3000.

## Database Setup

This project uses PostgreSQL with Drizzle ORM. To set up the database:

1. Create a PostgreSQL database
2. Update the DATABASE_URL in your .env file
3. Run migrations:

```bash
bun db:migrate
```

### Database Commands

- `bun db:migrate` - Run all pending migrations
- `bun db:migrate:fresh` - Drop all tables and re-run all migrations
- `bun db:generate` - Generate migration files from schema changes
- `bun db:studio` - Open Drizzle Studio to view and manage data
- `bun db:generate-test-data` - Populate database with test data

## Testing

### End-to-End Testing

This project uses Cypress for end-to-end testing.

1. Start the test runner:

```bash
bun test:e2e:open
```

2. Run all tests in headless mode:

```bash
bun test:e2e
```

### Test Data Generation

You can generate test data for development and testing purposes:

```bash
bun db:generate-test-data
```

This will create:

- 30 regular users
- 10 event organizers
- 20 events
- 50 event registrations

## User Roles and Authentication

### User Types

- **Visitor**: Unauthenticated user who can browse events
- **User**: Authenticated user who can register for events
- **Organizer**: Can create and manage events
- **Admin**: Has full access to all features

### Authentication Flow

1. Sign up/in with Clerk
2. User roles are synced between Clerk and the database
3. Role-based authorization is enforced via middleware

## Deployment

### Vercel Deployment

1. Push your repository to GitHub
2. Connect your repository to Vercel
3. Add all environment variables to Vercel
4. Deploy

### Database Deployment

For production, we recommend using a managed PostgreSQL service like:

- Neon
- Supabase
- Railway

Update the `NEON_DATABASE_URL` in your environment variables for production.

## Project Structure

```
event-management-system/
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   ├── hooks/         # Custom React hooks
│   ├── server/        # Server-side code
│   │   ├── api/       # tRPC API routes
│   │   └── db/        # Database operations
│   ├── styles/        # CSS styles
│   └── trpc/          # tRPC client and server setup
├── scripts/           # Utility scripts
├── cypress/           # End-to-end tests
├── drizzle/           # Database migrations
└── public/            # Static assets
```

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
