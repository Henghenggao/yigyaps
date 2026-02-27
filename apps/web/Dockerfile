# ─────────────────────────────────────────────────────────────────────────────
# YigYaps Web — Production Dockerfile
# Deployed as a separate Railway service.
# ─────────────────────────────────────────────────────────────────────────────

# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ALL workspace manifests (npm ci needs them all to resolve the lockfile)
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY packages/db/package*.json ./packages/db/
COPY packages/api/package*.json ./packages/api/
COPY packages/client/package*.json ./packages/client/
COPY packages/cli/package*.json ./packages/cli/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies (workspace-aware, uses lockfile)
RUN npm ci --ignore-scripts

# Copy source
COPY packages/types/ ./packages/types/
COPY packages/client/ ./packages/client/
COPY apps/web/ ./apps/web/

# VITE_API_URL is baked into the JS bundle at build time.
# Set this in Railway dashboard as a build variable:
#   VITE_API_URL = https://api.yigyaps.com
ARG VITE_API_URL=http://localhost:3100
ENV VITE_API_URL=$VITE_API_URL

# Build shared packages first, then the web app
RUN npm run build -w packages/types && \
    npm run build -w packages/client && \
    npm run build -w web

# ── Production Stage (nginx) ──────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx site
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (build context = repo root)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Railway injects PORT — nginx must listen on it
# We use envsubst to replace $PORT at container startup
ENV PORT=8080
EXPOSE $PORT

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf && nginx -c /tmp/nginx.conf -g 'daemon off;'"]
