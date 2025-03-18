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

## Database Management

This project uses Drizzle ORM with a migration-based workflow for database schema management. This approach ensures:
- Consistent database structure across all environments
- Version-controlled schema changes
- Safe collaboration between team members
- Reliable deployment process

### Database Environments

The project supports two database environments:

1. **Local Development** (`DATABASE_URL`)
   - Uses Docker-based PostgreSQL
   - Ideal for rapid development and testing
   - Start with `bun run db:start`
   - Connection details:
     ```
     Host: localhost
     Port: 5432
     User: postgres
     Password: postgres
     Database: postgres
     ```

2. **Production** (`NEON_DATABASE_URL`)
   - Uses Neon serverless PostgreSQL
   - Automatically used when `NEON_DATABASE_URL` is present
   - Set up at [neon.tech](https://neon.tech)

### Schema Management Workflow

#### For Individual Developers

1. **Making Schema Changes**
   ```bash
   # 1. Start your local database
   bun run db:start
   
   # 2. Edit schema in src/server/db/schema.ts
   # Example: Add a new column, create a table, etc.
   
   # 3. Generate a migration
   bun run db:generate
   
   # 4. Review the generated migration in drizzle/migrations/
   # Make sure it does what you expect!
   
   # 5. Apply the migration
   bun run db:migrate
   
   # 6. Test your changes
   # Use Drizzle Studio to verify:
   bun run db:studio
   ```

2. **Committing Changes**
   ```bash
   # Always commit both the schema changes and migration files:
   git add src/server/db/schema.ts
   git add drizzle/migrations/*
   git commit -m "feat(db): add [your change description]"
   ```

#### Team Collaboration

1. **Before Starting Work**
   ```bash
   # 1. Pull latest changes
   git pull origin main
   
   # 2. Start local database
   bun run db:start
   
   # 3. Apply any new migrations
   bun run db:migrate
   ```

2. **Handling Conflicts**
   - If multiple developers modify the schema:
     ```bash
     # 1. Stash your changes if needed
     git stash
     
     # 2. Pull latest changes
     git pull origin main
     
     # 3. Apply upstream migrations
     bun run db:migrate
     
     # 4. Reapply your changes
     git stash pop  # if you stashed
     
     # 5. Generate new migration
     bun run db:generate
     ```
   - Always review migrations before pushing
   - Coordinate major schema changes with team

3. **Best Practices**
   - One schema change per commit
   - Clear commit messages describing changes
   - Test migrations both up and down
   - Document breaking changes
   - Use meaningful migration names

### Migration Management

1. **Understanding Migration Files**
   - Located in `drizzle/migrations/`
   - Named with timestamps (e.g., `0000_initial.sql`)
   - Contains both `up` and `down` migrations
   - Automatically tracked in database

2. **Common Migration Tasks**
   ```bash
   # Generate migration after schema change
   bun run db:generate
   
   # Apply pending migrations
   bun run db:migrate
   
   # View database state
   bun run db:studio
   ```

3. **Troubleshooting Migrations**
   - If migrations fail:
     1. Check database connection
     2. Review migration files
     3. Check for conflicts with existing data
     4. Verify schema.ts changes
   
   - Common issues:
     - "Relation already exists": Migration already applied
     - "Relation doesn't exist": Missing migration
     - "Column cannot be null": Data consistency issue

### Production Deployments

1. **Vercel Deployment**
   - Migrations run automatically during build
   - Ensure `NEON_DATABASE_URL` is set in Vercel
   - Build command includes migrations:
     ```bash
     bun run db:migrate && next build
     ```

2. **Database Safety**
   - Always backup before major migrations
   - Test migrations on staging if possible
   - Use transactions for data migrations
   - Consider downtime for large migrations

3. **Monitoring & Maintenance**
   - Check migration status in production
   - Monitor database performance
   - Keep migrations under version control
   - Regular backups (automated with Neon)

### Development Tools

1. **Drizzle Studio**
   ```bash
   bun run db:studio
   ```
   - View and edit data
   - Explore schema
   - Debug issues
   - Works with both local and Neon databases

2. **Docker Database**
   ```bash
   # Start database
   bun run db:start
   
   # View logs
   docker logs event-management-postgres
   
   # Stop database
   docker stop event-management-postgres
   ```

3. **Schema Validation**
   - TypeScript integration
   - Runtime type checking
   - Automatic query validation
   - Built-in security features

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