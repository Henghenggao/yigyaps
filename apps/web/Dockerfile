# ─────────────────────────────────────────────────────────────────────────────
# YigYaps Web — Production Dockerfile
# Deployed as a separate Railway service.
# ─────────────────────────────────────────────────────────────────────────────

# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root manifests (needed by npm workspaces)
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY packages/client/package*.json ./packages/client/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies (workspace-aware)
RUN npm ci --workspaces --ignore-scripts

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
