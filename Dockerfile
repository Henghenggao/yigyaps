# ─────────────────────────────────────────────────────────────────────────────
# YigYaps API — Production Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
#
# Multi-stage build for optimized production image.
# Railway will auto-detect this Dockerfile if Nixpacks is not preferred.
#
# License: Apache 2.0
# ─────────────────────────────────────────────────────────────────────────────

# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY packages/db/package*.json ./packages/db/
COPY packages/api/package*.json ./packages/api/
COPY packages/client/package*.json ./packages/client/

# Install dependencies
RUN npm ci --workspaces

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ── Production Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY packages/db/package*.json ./packages/db/
COPY packages/api/package*.json ./packages/api/
COPY packages/client/package*.json ./packages/client/

# Install production dependencies only
RUN npm ci --workspaces --omit=dev

# Copy built artifacts
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Copy migration files (needed for db:migrate)
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations

# Copy migration runner script
COPY scripts/migrate.js ./scripts/migrate.js

# Expose port (Railway will override this)
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command: run migrations then start server
CMD ["sh", "-c", "npm run db:migrate && npm run start --workspace=@yigyaps/api"]
