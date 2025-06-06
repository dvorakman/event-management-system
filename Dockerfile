# Stage 1: Base image with Bun
FROM oven/bun:latest AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Stage 3: Development stage (target for docker-compose)
# Includes node_modules and source code
FROM deps AS development
# Copy the rest of the application code
# Note: node_modules are already present from the 'deps' stage
COPY . .
EXPOSE 3000
ENV NODE_ENV development
# Default command for development (can be overridden in compose)
CMD ["bun", "run", "dev"]

# Stage 4: Builder stage for production
FROM deps AS builder
# Copy the rest of the application code
COPY . .
ENV NODE_ENV production
RUN bun run build

# Stage 5: Runner stage for production
FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public

# Set the correct permission for fetching image from build cache
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=bun:bun /app/.next/standalone ./ 
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static 

# Set the user to Bun's default user
USER bun

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Server.js is created by next build output tracing
# https://nextjs.org/docs/advanced-features/output-file-tracing
CMD ["bun", "run", "start"] 