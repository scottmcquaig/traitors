# FantaCTV Production Dockerfile
# Optimized multi-stage build for Next.js with standalone output

# Build-time arguments for version information
ARG VERSION=0.0.0
ARG BUILD_DATE
ARG VCS_REF

# Stage 1: Install dependencies
FROM node:20-alpine AS deps

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation (layer caching optimization)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies based on available lock file
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "No lockfile found." && exit 1; \
  fi


# Stage 2: Build the application
FROM node:20-alpine AS builder

# Re-declare ARGs for this stage (ARGs are scoped to build stage)
ARG VERSION
ARG BUILD_DATE
ARG VCS_REF

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_VERSION=${VERSION}

# Build the Next.js application
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else npm run build; \
  fi


# Stage 3: Production runner
FROM node:20-alpine AS runner

# Re-declare ARGs for this stage
ARG VERSION
ARG BUILD_DATE
ARG VCS_REF

# OCI Image Labels (following OCI annotation spec)
LABEL org.opencontainers.image.title="FantaCTV" \
      org.opencontainers.image.description="Fantasy league application for The Traitors TV show" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="FantaCTV" \
      org.opencontainers.image.authors="FantaCTV Team" \
      org.opencontainers.image.source="https://github.com/fantactv/fantactv" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="FantaCTV Team"

WORKDIR /app

# Install tini for proper signal handling and wget for healthcheck
RUN apk add --no-cache tini wget

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_VERSION=${VERSION}

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output (requires output: 'standalone' in next.config.js)
# If not using standalone, copy the full .next folder instead
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set hostname for container networking
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check configuration
# Checks /api/health endpoint every 30 seconds
# Container is unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use tini as init system for proper signal handling (PID 1 zombie reaping, signal forwarding)
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"]
