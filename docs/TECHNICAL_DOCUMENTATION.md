# Technical Documentation - Event Management System

This technical documentation provides an in-depth guide to the architecture, components, and implementation details of the Event Management System. It's intended for developers who need to understand, maintain, or extend the codebase.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [API Layer](#api-layer)
7. [Frontend Components](#frontend-components)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Development Guidelines](#development-guidelines)

## Architecture Overview

The Event Management System is built as a full-stack application using a modern web stack. It follows a client-server architecture with:

- Next.js App Router for server-side rendering and routing
- tRPC for type-safe API communication
- PostgreSQL for data storage
- Clerk for authentication
- Drizzle ORM for database operations

The application is structured using the App Router pattern with a clear separation between server and client components.

### High-Level Architecture Diagram

```
┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│                 │      │              │      │              │
│  Next.js        │◄────►│  tRPC Router │◄────►│  PostgreSQL  │
│  Frontend       │      │  API Layer   │      │  Database    │
│                 │      │              │      │              │
└────────┬────────┘      └──────┬───────┘      └──────────────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐      ┌──────────────┐
│                 │      │              │
│  Clerk          │      │  Drizzle ORM │
│  Authentication │      │  Data Layer  │
│                 │      │              │
└─────────────────┘      └──────────────┘
```

## Technology Stack

### Frontend

- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI
- **React Hook Form**: Form handling
- **Zod**: Schema validation
- **React Query**: Data fetching and caching

### Backend

- **tRPC**: End-to-end type-safe API
- **Node.js**: JavaScript runtime
- **Drizzle ORM**: TypeScript ORM for PostgreSQL
- **PostgreSQL**: Relational database
- **Clerk**: Authentication and user management
- **Stripe**: Payment processing (simulated)

### Development Tools

- **TypeScript**: Type-safe JavaScript
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Cypress**: End-to-end testing
- **Bun**: JavaScript runtime and package manager

## Project Structure

The project follows a feature-based organization within the Next.js App Router structure:

```
event-management-system/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Authentication routes
│   │   │   ├── sign-in/          # Sign-in page
│   │   │   └── sign-up/          # Sign-up page
│   │   ├── api/                  # API routes
│   │   │   ├── trpc/             # tRPC route
│   │   │   └── webhooks/         # Webhook handlers
│   │   ├── become-organizer/     # Organizer application
│   │   ├── events/               # Event discovery
│   │   │   └── [id]/             # Event details
│   │   ├── organizer/            # Organizer dashboard
│   │   │   └── events/           # Event management
│   │   ├── tickets/              # Ticket management
│   │   ├── user/                 # User profile
│   │   ├── _components/          # Shared components
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # UI primitives (shadcn)
│   │   └── shared/               # Shared components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility functions
│   ├── server/                   # Server-side code
│   │   ├── api/                  # tRPC API implementation
│   │   │   ├── routers/          # API routers
│   │   │   └── trpc.ts           # tRPC initialization
│   │   ├── auth/                 # Authentication utilities
│   │   └── db/                   # Database operations
│   │       ├── schema.ts         # Drizzle schema
│   │       └── index.ts          # Database client
│   └── trpc/                     # tRPC client setup
├── cypress/                      # End-to-end tests
│   ├── e2e/                      # Test specifications
│   └── fixtures/                 # Test data
├── drizzle/                      # Database migrations
│   └── migrations/               # Migration files
├── scripts/                      # Utility scripts
│   ├── generate-test-data.ts     # Test data generation
│   ├── migrate.ts                # Database migration
│   └── start-db.mjs              # Database startup
├── public/                       # Static assets
├── .env.example                  # Example env variables
├── drizzle.config.ts             # Drizzle configuration
├── next.config.mjs               # Next.js configuration
├── cypress.config.ts             # Cypress configuration
└── package.json                  # Project dependencies
```

## Database Schema

The database schema is defined using Drizzle ORM in `src/server/db/schema.ts`:

### Core Tables

#### Users Table

Stores user information synchronized with Clerk:

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Events Table

Stores event information:

```typescript
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location").notNull(),
  type: eventTypeEnum("type").notNull(),
  organizerId: text("organizer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  generalTicketPrice: integer("general_ticket_price").notNull(),
  vipTicketPrice: integer("vip_ticket_price").notNull(),
  vipPerks: text("vip_perks"),
  maxAttendees: integer("max_attendees").notNull(),
  status: eventStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Registrations Table

Manages event registrations:

```typescript
export const registrations = pgTable("registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  status: registrationStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status")
    .default("pending")
    .notNull(),
  paymentIntentId: text("payment_intent_id"),
  ticketType: ticketTypeEnum("ticket_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Tickets Table

Stores ticket information:

```typescript
export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id")
    .notNull()
    .references(() => registrations.id, { onDelete: "cascade" }),
  qrCode: text("qr_code").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Relationships

The database tables have the following relationships:

1. **Users to Events**: One-to-many (Organizer)
2. **Users to Registrations**: One-to-many
3. **Events to Registrations**: One-to-many
4. **Registrations to Tickets**: One-to-one

## Authentication Flow

The application uses Clerk for authentication with a synchronized user model in the database.

### Authentication Process

1. **User Registration/Login**:

   - User authenticates through Clerk
   - User data is synced to our database

2. **User Role Management**:

   - Default role is "user"
   - Users can apply to become "organizer"
   - Admin can approve/reject organizer applications

3. **Authentication Middleware**:

   - `clerkMiddleware` protects routes based on authentication status
   - Public routes are accessible without authentication
   - Protected routes require authentication

4. **Server-Side Authentication**:
   - Server components use `currentUser()` from Clerk
   - tRPC procedures use `ctx.auth` to verify authentication

### User Synchronization

User data is synchronized between Clerk and the database:

```typescript
export async function syncUser(clerkUser: UserResource) {
  try {
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, clerkUser.id),
    });

    if (existingUser) {
      // Update existing user
      return await db
        .update(users)
        .set({
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          profileImageUrl: clerkUser.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, clerkUser.id))
        .returning()
        .then((res) => res[0]);
    } else {
      // Create new user
      return await db
        .insert(users)
        .values({
          id: clerkUser.id,
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          profileImageUrl: clerkUser.imageUrl,
          role: "user",
        })
        .returning()
        .then((res) => res[0]);
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    return null;
  }
}
```

## API Layer

The API is implemented using tRPC for type-safe communication between the client and server.

### tRPC Configuration

The tRPC configuration is defined in `src/server/api/trpc.ts`:

```typescript
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const auth = getAuth();
  const userId = auth.userId;

  return {
    db,
    userId,
    auth,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
```

### API Routers

The API is organized into feature-based routers:

#### Event Router

Handles event-related operations:

- `getAllEvents`: Retrieves events with filtering and pagination
- `getEventById`: Retrieves a single event by ID
- `createEvent`: Creates a new event (organizer only)
- `updateEvent`: Updates an existing event (organizer only)
- `cancelEvent`: Cancels an event and refunds attendees (organizer only)

#### Registration Router

Manages event registrations:

- `registerForEvent`: Creates a registration and initiates payment
- `getUserRegistrations`: Retrieves user's registrations
- `cancelRegistration`: Cancels a registration and processes refund

#### User Router

Handles user-related operations:

- `getProfile`: Retrieves user profile
- `updateProfile`: Updates user profile
- `applyForOrganizerRole`: Submits application to become an organizer

## Frontend Components

The frontend is built using React components organized by feature:

### Layout Components

- `RootLayout`: Main application layout with authentication wrapper
- `OrganizerLayout`: Layout for organizer dashboard
- `EventLayout`: Layout for event details pages

### Page Components

- `HomePage`: Landing page with featured events
- `EventsPage`: Event discovery and filtering
- `EventDetailPage`: Individual event details
- `OrganizerDashboardPage`: Dashboard for event organizers
- `BecomeOrganizerPage`: Form to apply for organizer role

### Reusable Components

- `EventCard`: Card displaying event summary
- `EventForm`: Form for creating/editing events
- `Pagination`: Reusable pagination component
- `FilterBar`: Filter controls for event discovery
- `TicketSelection`: Ticket type selector for registration

### Server Components vs. Client Components

The application uses both server and client components:

- **Server Components**: Used for data fetching and initial rendering
- **Client Components**: Used for interactive elements and forms

Example server component:

```tsx
// Server component for event list
export default async function EventsPage() {
  const events = await api.event.getAllEvents.query();

  return (
    <div>
      <h1>Events</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
```

Example client component:

```tsx
"use client";

// Client component for event form
export default function EventForm({ initialData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = api.useUtils();
  const createEvent = api.event.createEvent.useMutation({
    onSuccess: () => {
      utils.event.getAllEvents.invalidate();
      // Handle success
    },
  });

  const handleSubmit = (data) => {
    setIsSubmitting(true);
    createEvent.mutate(data);
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

## Testing

The application uses Cypress for end-to-end testing:

### Test Structure

Tests are organized by feature in the `cypress/e2e` directory:

- `homepage.cy.ts`: Tests for the homepage
- `event-registration.cy.ts`: Tests for event registration flow
- `organizer-dashboard.cy.ts`: Tests for organizer features

### Running Tests

Tests can be run using the following npm scripts:

- `bun cy:open`: Opens the Cypress test runner
- `bun cy:run`: Runs tests in headless mode
- `bun test:e2e`: Starts the development server and runs tests

### Test Example

```typescript
describe("Event Registration", () => {
  const mockUser = {
    email: "test@example.com",
    password: "Password123!",
  };

  before(() => {
    // Visit events page without login for testing
    cy.visit("/events");
  });

  it("should display events list", () => {
    cy.get('[data-test="event-card"]').should("have.length.at.least", 1);
  });

  it("should navigate to event details", () => {
    cy.get('[data-test="event-card"]').first().click();
    cy.get('[data-test="event-title"]').should("be.visible");
    cy.get('[data-test="event-description"]').should("be.visible");
  });

  it("should show ticket options", () => {
    cy.get('[data-test="ticket-options"]').should("be.visible");
    cy.contains("General Admission").should("be.visible");
    cy.contains("VIP").should("be.visible");
  });

  it("should start registration process", () => {
    cy.get('[data-test="ticket-selection"]').first().click();
    cy.get('[data-test="register-button"]').click();
    cy.get('[data-test="payment-form"]').should("be.visible");
  });
});
```

## Deployment

### Deployment Options

The application is configured for deployment on Vercel:

1. **Development Environment**:

   - Local development with Bun
   - Local PostgreSQL via Docker

2. **Production Environment**:
   - Vercel for hosting
   - Neon for PostgreSQL database
   - Clerk for authentication
   - Stripe for payment processing

### Environment Configuration

The application requires the following environment variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/event_management"
NEON_DATABASE_URL="postgresql://user:password@db.neon.tech/event_management"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

### Database Deployment Considerations

For production deployment:

1. **Schema Migrations**:

   - Run migrations before deployment
   - Use `drizzle-kit` for database migrations

2. **Database Performance**:

   - Add indexes for frequently queried fields
   - Consider connection pooling for high traffic

3. **Data Backup**:
   - Set up regular database backups
   - Implement point-in-time recovery if needed

## Development Guidelines

### Coding Standards

1. **TypeScript**:

   - Use strict type checking
   - Avoid any type when possible
   - Use interfaces for object shapes
   - Use type guards for type narrowing

2. **Component Structure**:

   - Use server components for data fetching
   - Use client components for interactivity
   - Keep components focused and reusable
   - Separate business logic from presentation

3. **API Design**:
   - Use tRPC procedures for type safety
   - Validate inputs with Zod schemas
   - Handle errors with try/catch blocks
   - Return consistent response structures

### Error Handling

Implement consistent error handling:

```typescript
try {
  // Operation that might fail
} catch (error) {
  // Log the error
  console.error("Operation failed:", error);

  // Return user-friendly error
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to complete the operation. Please try again.",
  });
}
```

### State Management

1. **Server State**:

   - Use tRPC queries and React Query for remote data
   - Implement proper caching and invalidation

2. **Local State**:
   - Use React hooks for component state
   - Use context for shared state when needed

### Performance Optimization

1. **Database Queries**:

   - Use selective queries with field selection
   - Add indexes for frequently queried fields
   - Use pagination for large data sets

2. **Frontend Performance**:
   - Implement image optimization
   - Use code splitting and lazy loading
   - Minimize client-side JavaScript

### Security Considerations

1. **Authentication**:

   - Use Clerk for secure authentication
   - Implement proper role-based access control
   - Validate permissions on the server

2. **Data Validation**:

   - Validate all user inputs with Zod
   - Prevent SQL injection with parameterized queries
   - Implement CSRF protection

3. **Payment Security**:
   - Use Stripe for secure payment processing
   - Never store sensitive payment data
   - Implement proper error handling for payments
