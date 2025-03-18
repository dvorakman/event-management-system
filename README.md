# Event Management System

This is a [T3 Stack](https://create.t3.gg/) project built with Next.js, tRPC, Drizzle ORM, and PostgreSQL.

## Database Configuration

This project supports both local PostgreSQL for development and Neon serverless PostgreSQL for production. The database connection is configured to automatically use:

1. **Neon Serverless PostgreSQL**: When `NEON_DATABASE_URL` environment variable is present
2. **Local PostgreSQL**: When `NEON_DATABASE_URL` is not present (default for development)

### Setting Up Local Development

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/event-management-system.git
   cd event-management-system
   ```

2. **Install dependencies**
   ```
   bun install
   ```

3. **Set up environment variables**
   ```
   cp .env.example .env
   ```
   By default, the `.env` file is configured to use a local PostgreSQL database to reduce Neon database usage during development.

4. **Start the local PostgreSQL database**
   
   Prerequisites:
   - [Docker](https://www.docker.com/get-started/) must be installed and running
   
   Start the database:
   ```bash
   bun run db:start
   ```
   
   The script will:
   - Check if Docker is running
   - Start an existing container if it exists
   - Create a new container if needed
   
   The database will be available at:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres`
   - Database: `postgres`

   To verify the database is running:
   ```bash
   docker ps
   ```
   You should see a container named `event-management-postgres` in the list.

   To stop the database:
   ```bash
   docker stop event-management-postgres
   ```

   To view database logs:
   ```bash
   docker logs event-management-postgres
   ```

   Troubleshooting:
   - If you see "port already in use" errors, check if another PostgreSQL instance is running
   - If Docker fails to start, ensure Docker Desktop is running
   - If connection fails, try stopping any existing containers and starting again

5. **Run the development server**
   ```
   bun run dev
   ```

## Using with Neon Database

To use the Neon Serverless PostgreSQL database:

1. Create a Neon account and project at [neon.tech](https://neon.tech)
2. Get your connection string from the Neon dashboard
3. Uncomment and update the `NEON_DATABASE_URL` in your `.env` file:
   ```
   NEON_DATABASE_URL="postgres://username:password@endpoint.neon.tech/dbname?sslmode=require"
   ```

The application will automatically detect the presence of `NEON_DATABASE_URL` and use the Neon database instead of the local PostgreSQL database. This configuration works for both the application and tools like Drizzle Studio.

## Database Scripts

- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run migrations
- `bun run db:push` - Push schema changes to the database
- `bun run db:studio` - Open Drizzle Studio to explore your database (works with both local and Neon databases)
- `bun run db:local:start` - Start local PostgreSQL using Docker (Unix/Mac)
- `bun run db:local:start:win` - Start local PostgreSQL using Docker (Windows)

## Deployment on Vercel

This project is configured for easy deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure the environment variables:
   - `NEON_DATABASE_URL`: Your Neon database connection string
   - `DATABASE_URL`: Same as your `NEON_DATABASE_URL` for production deployments
   - Add any other environment variables needed (Clerk keys, etc.)

## Learn More

To learn more about the tech stack:

- [Next.js](https://nextjs.org)
- [Drizzle ORM](https://orm.drizzle.team)
- [tRPC](https://trpc.io)
- [Neon Serverless PostgreSQL](https://neon.tech)
- [T3 Stack](https://create.t3.gg/)