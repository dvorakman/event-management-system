# Event Management System

This is a [T3 Stack](https://create.t3.gg/) project built with Next.js, tRPC, Drizzle ORM, and PostgreSQL.

## Local Development Setup (Using Docker)

This project uses Docker Compose for a consistent and simplified local development environment.

**Prerequisites:**

*   [Docker](https://www.docker.com/get-started/) must be installed and running.

**Steps:**

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/event-management-system.git
    cd event-management-system
    ```

2.  **Set up environment variables**
    Create a `.env` file by copying the example. Fill in your Clerk keys. The `DATABASE_URL` is automatically handled by Docker Compose for local development.
    ```bash
    cp .env.example .env
    # Edit .env to add your Clerk keys.
    ```
    **Important:** Keep `NEON_DATABASE_URL` commented out in `.env` for local Docker development to ensure the containerized PostgreSQL is used.

3.  **Build and Start Docker Containers**
    This command will build the Next.js app image (if it doesn't exist or Dockerfile changed) and start the app and PostgreSQL database containers.
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces Docker to build the image based on the `Dockerfile`. Necessary on first run or after `Dockerfile` changes.
    *   `-d`: Runs the containers in detached mode (in the background).

    Your application should now be running at http://localhost:3000. The PostgreSQL database is running internally, accessible to the app container via the hostname `db`.

4.  **Run Database Migrations**
    Migrations need to be run against the database *inside* the Docker container. Use `docker-compose exec` to run the migration command within the `app` container:
    ```bash
    docker-compose exec app bun run db:migrate
    ```

5.  **(Optional) Generate Test Data and Sync Clerk Users**

After running migrations, you may want to populate your database with realistic test data and ensure all Clerk users are synced to your local database. This is especially useful for development, testing, and demos.

### **Sync Clerk Users to the Database**
This script pulls all users from Clerk (both organizers and regular users) and upserts them into your local database. This ensures your app's user table matches Clerk as the source of truth.

```bash
# Inside the app container:
docker-compose exec app bun run scripts/sync-clerk-users.ts
```

### **Generate Synthetic Test Data**
This script generates realistic events, registrations, tickets, and notifications, linking them to the Clerk users in your database. You must have both organizers and regular users in Clerk for the data to be realistic.

```bash
# Inside the app container:
docker-compose exec app bun run scripts/generate-synthetic-data.ts
```

**Note:**
- You can run database commands (migrations, test data generation, Clerk sync, etc.) either inside the Docker container **or** directly on your host machine, as long as your `DATABASE_URL` in your environment points to the running Docker database. The only requirement is that the database container is running and accessible.
- The provided `docker-compose exec app ...` commands are recommended for consistency, but running `bun run ...` directly on your host will work if your environment is set up correctly.

**Common Docker Commands:**

*   **Start containers:** `docker-compose up -d`
*   **Stop containers:** `docker-compose down`
*   **Stop and remove volumes (clears DB data):** `docker-compose down -v`
*   **View logs:** `docker-compose logs -f` (for all services) or `docker-compose logs -f app` / `docker-compose logs -f db`
*   **Execute a command inside the app container:** `docker-compose exec app <command>` (e.g., `docker-compose exec app ls -l`, `docker-compose exec app bun run lint`)
*   **Connect to the database container:** `docker-compose exec db psql -U postgres -d postgres`

**Development Workflow with Docker:**

*   **Running Commands:** All project-specific commands (linting, testing, migrations, etc.) should be run *inside* the `app` container using `docker-compose exec app <command>`.
    *   Lint: `docker-compose exec app bun run lint`
    *   Type Check: `docker-compose exec app bun run typecheck`
    *   Run Tests (if configured): `docker-compose exec app bun run test` (adjust based on your actual test script)
*   **Code Changes:** Edit your code locally. Thanks to the volume mount in `docker-compose.yml`, the Next.js dev server inside the `app` container will automatically detect changes and hot-reload.
*   **Adding Packages:** Run `bun install <package-name>` **inside the running container**:
    ```bash
    docker-compose exec app bun install <package-name>
    ```
    This updates `package.json` and `bun.lock` both inside the container and on your local machine (due to the volume mount). Re-running `docker-compose up --build` is **not** typically needed just for adding packages this way.
*   **Schema Changes & Migrations:**
    1.  Edit `src/server/db/schema.ts` locally.
    2.  Generate migrations **inside the container**:
        ```bash
        docker-compose exec app bun run db:generate
        ```
        *(Migration files will appear in your local `drizzle/migrations` folder due to the volume mount)*
    3.  Apply the migrations **inside the container**:
        ```bash
        docker-compose exec app bun run db:migrate
        ```
*   **Running Drizzle Studio:** Drizzle Studio needs direct access to the database. Since the DB is in Docker, run the command **inside the container**:
    ```bash
    docker-compose exec app bun run db:studio
    ```
    Then, access Drizzle Studio via the URL provided in the terminal (likely using `localhost` and the forwarded port).

## Database Configuration (Overview)

This project supports:

1.  **Local Docker PostgreSQL:** Used automatically during `docker-compose up`. Configuration is handled within `docker-compose.yml`.
2.  **Neon Serverless PostgreSQL:** Used for production/preview deployments on Vercel or if you manually uncomment `NEON_DATABASE_URL` in your `.env` file locally (though Docker is the recommended local method).

### Preview Deployments

For Vercel preview deployments, the database schema is automatically reset before migrations are applied. This ensures each preview deployment starts with a clean database state. See [Preview Deployments Documentation](./docs/PREVIEW_DEPLOYMENTS.md).

## Using with Neon Database (Alternative to Docker Local)

If you choose *not* to use the Docker setup locally and prefer connecting directly to Neon:

1.  Ensure Docker containers are stopped (`docker-compose down`).
2.  Create a Neon account and project at [neon.tech](https://neon.tech).
3.  Get your connection string.
4.  Uncomment and update `NEON_DATABASE_URL` in your `.env` file.
5.  Run the app directly: `bun run dev`.
6.  Run migrations directly: `bun run db:migrate`.

## Database Management (Using Drizzle ORM)

This project uses Drizzle ORM with a migration-based workflow.

### Database Environments

1.  **Local Docker Development:** Managed via `docker-compose`. Database hostname is `db` inside the network, accessible via `localhost:5432` from your host machine if needed.
2.  **Production (Neon):** Configured via `NEON_DATABASE_URL` environment variable on Vercel.

### Schema Management Workflow (with Docker)

1.  **Making Schema Changes:**
    ```bash
    # 1. Ensure containers are running
    docker-compose up -d

    # 2. Edit schema in src/server/db/schema.ts locally

    # 3. Generate migration (inside container)
    docker-compose exec app bun run db:generate

    # 4. Review migration in drizzle/migrations/ (locally)

    # 5. Apply migration (inside container)
    docker-compose exec app bun run db:migrate

    # 6. Test (e.g., using Drizzle Studio inside container)
    docker-compose exec app bun run db:studio
    ```

2.  **Committing Changes:** Commit `schema.ts` and the generated migration files.

#### Team Collaboration

1.  **Before Starting Work:**
    ```bash
    # 1. Pull latest changes
    git pull origin main

    # 2. Ensure Docker containers are running
    docker-compose up -d

    # 3. Apply any new migrations (inside container)
    docker-compose exec app bun run db:migrate
    ```

2.  **Handling Conflicts:** Follow standard Git practices. After pulling and resolving code conflicts, ensure you apply any new migrations from `main` using the `docker-compose exec app bun run db:migrate` command before continuing your work or generating new migrations.

### Migration Management

*   **Generate:** `docker-compose exec app bun run db:generate`
*   **Apply:** `docker-compose exec app bun run db:migrate`
*   **Reset & Apply All (Deletes Data!):** `docker-compose exec app bun run db:migrate:fresh`
*   **View Database:** `docker-compose exec app bun run db:studio`

### Database Reset (Docker Development)

To completely reset your local Docker database and start fresh:

```bash
# Stop containers and remove the persistent volume
docker-compose down -v

# Restart containers (a new empty volume will be created)
docker-compose up --build -d

# Apply all migrations to the fresh database
docker-compose exec app bun run db:migrate
```
⚠️ **Warning**: `docker-compose down -v` permanently deletes your local database data.

## Authentication with Clerk

This project uses [Clerk](https://clerk.com/) for authentication and user management. Clerk is a complete authentication and user management solution that provides sign-up, sign-in, and user profile management out of the box.

### Configuration

1. **Environment Variables Setup**

   The application requires the following Clerk environment variables:

   ```
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

2. **Authentication Flow**

   The authentication flow is handled by Clerk's middleware, which protects routes based on authentication status.

## Deployment on Vercel

Docker is used for **local development consistency**. Vercel **does not** use your `Dockerfile` or `docker-compose.yml` for deployment.

1.  Connect your GitHub repository to Vercel.
2.  Configure environment variables in Vercel project settings:
    *   `NEON_DATABASE_URL`: Your Neon database connection string.
    *   `DATABASE_URL`: Typically set to the same value as `NEON_DATABASE_URL` for production builds/migrations on Vercel.
    *   `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, etc.
3.  Vercel automatically detects Next.js, runs your build command (e.g., `bun run build`), which **includes running migrations** against the configured `DATABASE_URL`/`NEON_DATABASE_URL`, and deploys the application.

## Learn More

To learn more about the tech stack:

- [Next.js](https://nextjs.org)
- [Drizzle ORM](https://orm.drizzle.team)
- [tRPC](https://trpc.io)
- [Neon Serverless PostgreSQL](https://neon.tech)
- [T3 Stack](https://create.t3.gg/)

### Development Tools

1.  **Drizzle Studio:** Run inside the container: `docker-compose exec app bun run db:studio`
2.  **Docker Desktop:** Provides GUI for managing containers, volumes, logs.
3.  **Direct DB Access (Optional):** Connect using a DB client (like DBeaver, TablePlus) to `localhost:5432` (user: `postgres`, pass: `postgres`, db: `postgres`).
4.  **Common Tasks:**
    *   Linting: `docker-compose exec app bun run lint`
    *   Formatting: `docker-compose exec app bun run format:write`
    *   Type Checking: `docker-compose exec app bun run typecheck`
