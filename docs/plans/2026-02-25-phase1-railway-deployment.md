# Phase 1: Railway Deployment Infrastructure

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy YigYaps API to Railway at api.yigyaps.com with PostgreSQL database

**Architecture:** Standalone Fastify API service with PostgreSQL (both on Railway). Uses Drizzle ORM for migrations. No GitHub OAuth in Phase 1 (uses temporary ADMIN_SECRET for write protection). Static .well-known/mcp.json served via API endpoint.

**Tech Stack:** Fastify, Drizzle ORM, PostgreSQL, Railway, Nixpacks/Dockerfile

---

## Task 1: Install Dependencies

**Files:**
- Modify: `c:\Users\gaoyu\Documents\GitHub\yigyaps\package.json`

**Step 1: Install all workspace dependencies**

Run the following command to install all dependencies for the monorepo:

```bash
npm install
```

**Expected output:** Success message showing all packages installed

**Step 2: Build TypeScript packages**

```bash
npm run build
```

**Expected output:** Successful compilation of all packages (types, db, api, client)

**Step 3: Verify API can start locally**

First, set temporary DATABASE_URL:

```bash
# Windows
set DATABASE_URL=postgresql://localhost:5432/yigyaps_local
npm run dev:api
```

**Expected output:** Either "YigYaps API listening on 0.0.0.0:3100" OR connection error (expected if no local DB)

Press Ctrl+C to stop the server.

**Step 4: Commit**

```bash
git add package-lock.json
git commit -m "chore: install dependencies for YigYaps monorepo"
```

---

## Task 2: Create Drizzle Migration Configuration

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\packages\db\drizzle.config.ts`
- Modify: `c:\Users\gaoyu\Documents\GitHub\yigyaps\packages\db\package.json`

**Step 1: Create drizzle.config.ts**

Create the Drizzle configuration file for generating migrations:

```typescript
/**
 * Drizzle Kit Configuration for YigYaps Database
 *
 * Generates SQL migrations from the TypeScript schema definitions.
 * Run: npm run db:generate (from packages/db/)
 *
 * License: Apache 2.0
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/yigyaps",
  },
});
```

**Step 2: Add drizzle-kit as dev dependency**

```bash
cd packages/db
npm install --save-dev drizzle-kit
```

**Step 3: Add migration scripts to db/package.json**

Add the following scripts to `packages/db/package.json` under the `"scripts"` section:

```json
{
  "scripts": {
    "build": "tsc -b",
    "clean": "tsc -b --clean",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Step 4: Generate initial migration**

```bash
cd packages/db
npm run db:generate
```

**Expected output:**
- Creates `packages/db/migrations/` directory
- Generates SQL migration file with timestamp (e.g., `0000_create_yy_tables.sql`)
- Contains CREATE TABLE statements for all 5 yy_* tables

**Step 5: Verify migration file**

```bash
ls migrations/
```

**Expected output:** At least one `.sql` file with CREATE TABLE statements

**Step 6: Add migration script to root package.json**

Add to root `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc -b",
    "clean": "tsc -b --clean",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "dev:api": "npm run dev --workspace=@yigyaps/api",
    "db:generate": "npm run db:generate --workspace=@yigyaps/db",
    "db:migrate": "node scripts/migrate.js"
  }
}
```

**Step 7: Commit**

```bash
cd ../..
git add packages/db/drizzle.config.ts packages/db/package.json packages/db/migrations/ package.json
git commit -m "feat: add Drizzle migration configuration and generate initial schema

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Migration Runner Script

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\scripts\migrate.js`

**Step 1: Create scripts directory**

```bash
mkdir -p scripts
```

**Step 2: Create migration runner script**

Create `scripts/migrate.js`:

```javascript
/**
 * YigYaps Database Migration Runner
 *
 * Runs Drizzle migrations against PostgreSQL.
 * Used during Railway deployment and local development.
 *
 * Usage: node scripts/migrate.js
 * Requires: DATABASE_URL environment variable
 *
 * License: Apache 2.0
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Pool } = pg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🚀 Starting YigYaps database migrations...");
  console.log(`📍 Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsFolder = join(__dirname, "../packages/db/migrations");

    console.log(`📂 Migrations folder: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });

    console.log("✅ Migrations completed successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
```

**Step 3: Make script executable and test help**

```bash
node scripts/migrate.js
```

**Expected output:** Error about missing DATABASE_URL (this is correct - we'll provide it in Railway)

**Step 4: Commit**

```bash
git add scripts/migrate.js
git commit -m "feat: add database migration runner script

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Environment Variables Documentation

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\.env.example`
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\.gitignore` (or modify if exists)

**Step 1: Create .env.example**

Create `.env.example` at repository root:

```bash
# ─────────────────────────────────────────────────────────────────────────────
# YigYaps API Environment Variables
# ─────────────────────────────────────────────────────────────────────────────

# ── Database ──────────────────────────────────────────────────────────────────
# PostgreSQL connection string (Railway auto-injects this)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# ── Server ────────────────────────────────────────────────────────────────────
# Port for the API server (Railway sets this automatically)
PORT=3100

# Host binding (use 0.0.0.0 for Railway/Docker)
HOST=0.0.0.0

# Public API URL (used in MCP registry discovery)
YIGYAPS_API_URL=https://api.yigyaps.com

# ── Security ──────────────────────────────────────────────────────────────────
# CORS allowed origins (comma-separated or "*" for all)
CORS_ORIGIN=*

# Temporary admin secret for write operations (Phase 1 only)
# Phase 2 will replace this with GitHub OAuth
ADMIN_SECRET=change_this_to_a_secure_random_string

# ── Logging ───────────────────────────────────────────────────────────────────
# Log level: trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# ── Phase 2+ (Not Yet Implemented) ────────────────────────────────────────────
# GitHub OAuth (Phase 2)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
# GITHUB_CALLBACK_URL=https://api.yigyaps.com/auth/github/callback

# JWT signing secret (Phase 2)
# JWT_SECRET=

# Session cookie secret (Phase 2)
# SESSION_SECRET=
```

**Step 2: Update .gitignore**

Ensure `.gitignore` excludes environment files:

```bash
# Check if .gitignore exists
if [ -f .gitignore ]; then
  # Add .env to .gitignore if not already present
  grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
else
  # Create .gitignore
  echo ".env" > .gitignore
  echo "node_modules/" >> .gitignore
  echo "dist/" >> .gitignore
  echo ".DS_Store" >> .gitignore
fi
```

**Step 3: Verify .gitignore**

```bash
cat .gitignore
```

**Expected output:** Should include `.env`, `node_modules/`, `dist/`

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs: add environment variables documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Railway Configuration

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\railway.toml`

**Step 1: Create railway.toml**

Create `railway.toml` at repository root:

```toml
# ─────────────────────────────────────────────────────────────────────────────
# YigYaps Railway Configuration
# ─────────────────────────────────────────────────────────────────────────────
#
# This configuration defines how Railway builds and runs the YigYaps API.
# Railway automatically detects this file and uses it for deployment.
#
# Services:
#   1. yigyaps-api (this service)
#   2. PostgreSQL database (created separately in Railway dashboard)
#
# License: Apache 2.0
# ─────────────────────────────────────────────────────────────────────────────

[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run db:migrate && npm run start --workspace=@yigyaps/api"
healthcheckPath = "/v1/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[deploy.environmentVariables]]
name = "NODE_ENV"
value = "production"

[[deploy.environmentVariables]]
name = "LOG_LEVEL"
value = "info"

[[deploy.environmentVariables]]
name = "YIGYAPS_API_URL"
value = "https://api.yigyaps.com"

[[deploy.environmentVariables]]
name = "CORS_ORIGIN"
value = "*"

# NOTE: DATABASE_URL is automatically injected by Railway when you link the PostgreSQL service
# NOTE: ADMIN_SECRET should be set in Railway dashboard as a secret variable
```

**Step 2: Verify railway.toml syntax**

```bash
cat railway.toml
```

**Expected output:** Valid TOML file content

**Step 3: Commit**

```bash
git add railway.toml
git commit -m "feat: add Railway deployment configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Dockerfile (Optional Fallback)

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\Dockerfile`
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\.dockerignore`

**Step 1: Create Dockerfile**

Railway uses Nixpacks by default, but having a Dockerfile provides an explicit fallback:

```dockerfile
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
```

**Step 2: Create .dockerignore**

```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
*.tsbuildinfo

# Environment files
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Documentation
docs/
*.md
!README.md

# Tests
**/*.test.ts
**/*.spec.ts
coverage/

# CI/CD
.github/
.gitlab-ci.yml
```

**Step 3: Verify Docker build (optional - requires Docker Desktop)**

```bash
# Only run if you have Docker installed and want to test locally
# docker build -t yigyaps-api:test .
```

**Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add Dockerfile for container deployment

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Admin Secret Validation Middleware (Phase 1 MVP)

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\packages\api\src\middleware\auth.ts`
- Modify: `c:\Users\gaoyu\Documents\GitHub\yigyaps\packages\api\src\routes\packages.ts`

**Step 1: Create auth middleware**

Create `packages/api/src/middleware/auth.ts`:

```typescript
/**
 * YigYaps API Authentication Middleware
 *
 * Phase 1: Simple ADMIN_SECRET for write operations
 * Phase 2: Will be replaced with GitHub OAuth + API key validation
 *
 * License: Apache 2.0
 */

import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Validates ADMIN_SECRET for write operations (Phase 1 only)
 *
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 *
 * @example
 * // In route handler:
 * fastify.post("/v1/packages", { preHandler: requireAdminAuth }, handler);
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminSecret = process.env.ADMIN_SECRET;

  // If ADMIN_SECRET is not configured, reject all write operations
  if (!adminSecret) {
    request.log.error("ADMIN_SECRET environment variable is not configured");
    return reply.status(500).send({
      error: "Server misconfiguration",
      message: "Authentication is not properly configured",
    });
  }

  // Extract Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing Authorization header",
    });
  }

  // Validate Bearer token format
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid Authorization header format. Expected: Bearer <token>",
    });
  }

  // Validate token matches ADMIN_SECRET
  if (token !== adminSecret) {
    return reply.status(403).send({
      error: "Forbidden",
      message: "Invalid credentials",
    });
  }

  // Authentication successful - continue to route handler
  request.log.info("Admin authentication successful");
}
```

**Step 2: Apply middleware to POST/PUT/DELETE routes**

Modify `packages/api/src/routes/packages.ts` to import and apply the middleware.

Find the POST route and add `preHandler`:

```typescript
// At the top of the file, add import:
import { requireAdminAuth } from "../middleware/auth.js";

// Then modify the POST route:
fastify.post(
  "/",
  { preHandler: requireAdminAuth },  // Add this line
  async (request, reply) => {
    // ... existing handler code
  }
);
```

**Step 3: Test authentication locally**

```bash
# Start the API server (if not already running)
npm run dev:api

# In another terminal, test without auth (should fail)
curl -X POST http://localhost:3100/v1/packages -H "Content-Type: application/json" -d '{"packageId":"test"}'

# Expected: 401 Unauthorized

# Test with wrong auth (should fail)
curl -X POST http://localhost:3100/v1/packages -H "Authorization: Bearer wrong" -H "Content-Type: application/json" -d '{"packageId":"test"}'

# Expected: 403 Forbidden
```

**Step 4: Commit**

```bash
git add packages/api/src/middleware/auth.ts packages/api/src/routes/packages.ts
git commit -m "feat: add ADMIN_SECRET authentication middleware for Phase 1

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update API Health Check to Include Version Info

**Files:**
- Modify: `c:\Users\gaoyu\Documents\GitHub\yigyaps\packages\api\src\routes\registry.ts`

**Step 1: Enhance health check endpoint**

Update the health check to provide more deployment information:

```typescript
export async function registryRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (request, reply) => {
    // Test database connection
    let dbStatus = "disconnected";
    try {
      await fastify.db.execute("SELECT 1");
      dbStatus = "connected";
    } catch (error) {
      request.log.error({ error }, "Database health check failed");
    }

    const response = {
      status: dbStatus === "connected" ? "healthy" : "degraded",
      service: "yigyaps-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = dbStatus === "connected" ? 200 : 503;
    return reply.status(statusCode).send(response);
  });
}
```

**Step 2: Test health check**

```bash
curl http://localhost:3100/v1/health
```

**Expected output (if DB not connected):**
```json
{
  "status": "degraded",
  "service": "yigyaps-api",
  "version": "0.1.0",
  "timestamp": "2026-02-25T...",
  "database": "disconnected",
  "environment": "development"
}
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/registry.ts
git commit -m "feat: enhance health check with database status

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Railway Deployment Guide

**Files:**
- Create: `c:\Users\gaoyu\Documents\GitHub\yigyaps\docs\DEPLOYMENT.md`

**Step 1: Create deployment documentation**

Create `docs/DEPLOYMENT.md`:

```markdown
# YigYaps Deployment Guide

## Phase 1: Railway Deployment (MVP)

This guide walks through deploying YigYaps API to Railway with PostgreSQL.

### Prerequisites

- [ ] Railway account ([railway.app](https://railway.app))
- [ ] Railway CLI installed (optional): `npm install -g @railway/cli`
- [ ] GitHub repository pushed to remote
- [ ] Domain `api.yigyaps.com` ready for DNS configuration

---

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `Henghenggao/yigyaps` (or your fork)
5. Railway will auto-detect `railway.toml` and begin building

---

## Step 2: Add PostgreSQL Database

1. In the Railway project, click **"+ New Service"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will provision a PostgreSQL instance
4. Railway automatically creates a `DATABASE_URL` environment variable

---

## Step 3: Configure Environment Variables

In the Railway API service settings, add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `ADMIN_SECRET` | `<random-secure-string>` | Generate with `openssl rand -hex 32` |
| `YIGYAPS_API_URL` | `https://api.yigyaps.com` | Your custom domain |
| `CORS_ORIGIN` | `*` | Or specific origins |
| `LOG_LEVEL` | `info` | Or `debug` for troubleshooting |
| `NODE_ENV` | `production` | Automatically set by Railway |

**Note:** `DATABASE_URL` is automatically injected by Railway when you link the PostgreSQL service.

---

## Step 4: Connect Database to API Service

1. Click on the API service
2. Go to **"Settings"** → **"Service Variables"**
3. Click **"+ Reference"** → Select the PostgreSQL service
4. Choose `DATABASE_URL` variable
5. Railway will automatically inject this into the API service

---

## Step 5: Deploy and Run Migrations

Railway will automatically:
1. Run `npm install && npm run build` (build step)
2. Run `npm run db:migrate` (creates tables)
3. Run `npm run start --workspace=@yigyaps/api` (starts server)

Monitor the deployment logs:
```bash
railway logs
```

Expected log output:
```
🚀 Starting YigYaps database migrations...
📍 Database: postgresql://****@****:5432/****
📂 Migrations folder: /app/packages/db/migrations
✅ Migrations completed successfully!
YigYaps API listening on 0.0.0.0:3100
```

---

## Step 6: Configure Custom Domain

### In Railway Dashboard:

1. Click on the API service
2. Go to **"Settings"** → **"Networking"**
3. Click **"Add Custom Domain"**
4. Enter `api.yigyaps.com`
5. Railway will provide CNAME record instructions

### In Your DNS Provider (e.g., Cloudflare):

Add a CNAME record:
```
Type:  CNAME
Name:  api
Value: yigyaps-api.up.railway.app (provided by Railway)
TTL:   Auto
```

Wait 5-10 minutes for DNS propagation.

---

## Step 7: Verify Deployment

### Test Health Endpoint:

```bash
curl https://api.yigyaps.com/v1/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "yigyaps-api",
  "version": "0.1.0",
  "database": "connected",
  "environment": "production"
}
```

### Test MCP Discovery:

```bash
curl https://api.yigyaps.com/.well-known/mcp.json
```

**Expected response:**
```json
{
  "registries": [
    {
      "name": "YigYaps",
      "description": "The open marketplace for YAP skills — MCP-compatible skill registry",
      "url": "https://api.yigyaps.com/v1",
      "version": "1.0.0"
    }
  ]
}
```

### Test Package Creation (with auth):

```bash
curl -X POST https://api.yigyaps.com/v1/packages \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "test-skill",
    "version": "1.0.0",
    "displayName": "Test Skill",
    "description": "A test skill package",
    "author": "test-author",
    "authorName": "Test Author"
  }'
```

**Expected response:** `201 Created` with package details

---

## Step 8: Static File for yigyaps.com/.well-known/mcp.json

Since the portal (`yigyaps.com`) doesn't exist yet in Phase 1, you have two options:

### Option A: Redirect to API (Recommended)

Add a redirect rule in your DNS/hosting provider:
```
yigyaps.com/.well-known/mcp.json → https://api.yigyaps.com/.well-known/mcp.json
```

### Option B: Static Hosting

1. Deploy `.well-known/mcp.json` to a static host (Vercel, Netlify, Cloudflare Pages)
2. Point `yigyaps.com` to that static host
3. The file is already in the repository at `.well-known/mcp.json`

---

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` is injected by checking service variables
- Check PostgreSQL service is running
- Check Railway service logs for connection errors

### "ADMIN_SECRET is not configured"
- Verify `ADMIN_SECRET` is set in Railway environment variables
- Redeploy after adding the variable

### "Migration failed"
- Check Railway build logs
- Verify `packages/db/migrations/` directory exists in built image
- Try manual migration: `railway run npm run db:migrate`

### Health check returns 503
- Database connection issue
- Check PostgreSQL service status
- Verify service linking in Railway

---

## Next Steps (Phase 2)

After Phase 1 deployment is stable:

- [ ] GitHub OAuth App registration
- [ ] Add `yy_creators` table migration
- [ ] Implement OAuth routes (`/auth/github`, `/auth/github/callback`)
- [ ] Replace `ADMIN_SECRET` with API key authentication
- [ ] Publish `@yigyaps/types` and `@yigyaps/client` to npm

---

## Rollback

To rollback to a previous deployment:

```bash
railway rollback
```

Or select a specific deployment in the Railway dashboard.

---

## Support

- **Railway Docs:** https://docs.railway.app
- **YigYaps Issues:** https://github.com/Henghenggao/yigyaps/issues
```

**Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: add Railway deployment guide for Phase 1

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create Quick Start README

**Files:**
- Modify: `c:\Users\gaoyu\Documents\GitHub\yigyaps\README.md`

**Step 1: Update README with deployment status**

Add a deployment section near the top of `README.md`:

```markdown
# YigYaps

> The open marketplace for YAP skills — MCP-compatible skill registry

## 🚀 Deployment Status

| Service | URL | Status | Phase |
|---------|-----|--------|-------|
| API | [api.yigyaps.com](https://api.yigyaps.com) | 🟢 Live | Phase 1 |
| MCP Discovery | [api.yigyaps.com/.well-known/mcp.json](https://api.yigyaps.com/.well-known/mcp.json) | 🟢 Live | Phase 1 |
| Portal | yigyaps.com | 🔴 Not Yet | Phase 3 |
| GitHub OAuth | — | 🟡 Planned | Phase 2 |

## 📦 Phase 1: MVP (Current)

**What's Live:**
- ✅ REST API at `api.yigyaps.com`
- ✅ PostgreSQL database (5 tables: packages, installations, reviews, mints, royalties)
- ✅ MCP Registry discovery endpoint
- ✅ Public read access (GET endpoints)
- ✅ Write access via `ADMIN_SECRET` (temporary)

**What's Coming:**
- 🟡 GitHub OAuth authentication (Phase 2)
- 🟡 Creator API keys (Phase 2)
- 🟡 npm packages `@yigyaps/types` and `@yigyaps/client` (Phase 2)
- 🔴 Portal UI at `yigyaps.com` (Phase 3)

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or use Railway for development)
- npm 9+

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Henghenggao/yigyaps.git
   cd yigyaps
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL and ADMIN_SECRET
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Build and start API:**
   ```bash
   npm run build
   npm run dev:api
   ```

6. **Verify health check:**
   ```bash
   curl http://localhost:3100/v1/health
   ```

## 📖 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) — Railway deployment instructions
- [API Reference](docs/API.md) — REST API endpoints (coming soon)
- [Architecture](docs/ARCHITECTURE.md) — System design (coming soon)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

Apache 2.0 — See [LICENSE](LICENSE)
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with Phase 1 deployment status

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Final Pre-Deployment Checklist

**Step 1: Verify all files are committed**

```bash
git status
```

**Expected output:** `nothing to commit, working tree clean`

**Step 2: Push to GitHub**

```bash
git push origin main
```

**Expected output:** Successful push to remote repository

**Step 3: Verify GitHub repository**

Visit `https://github.com/Henghenggao/yigyaps` and confirm:
- [ ] `railway.toml` is present
- [ ] `Dockerfile` is present
- [ ] `packages/db/migrations/` contains SQL files
- [ ] `.env.example` is present
- [ ] `docs/DEPLOYMENT.md` is present

**Step 4: Review pre-deployment checklist**

Before proceeding to Railway:

- [ ] All TypeScript code compiles (`npm run build`)
- [ ] No syntax errors in configuration files
- [ ] Migration files exist in `packages/db/migrations/`
- [ ] `.env.example` documents all required variables
- [ ] `ADMIN_SECRET` generation method documented
- [ ] Health check endpoint includes database status
- [ ] Auth middleware protects write endpoints

**Step 5: Generate ADMIN_SECRET**

Generate a secure admin secret for Railway:

```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Save this value** — you'll need it for Railway environment variables.

---

## 🎉 Implementation Complete!

The codebase is now ready for Railway deployment.

### What You Have Now:

1. ✅ Complete database schema with migrations
2. ✅ Fastify API with all routes implemented
3. ✅ Railway deployment configuration (`railway.toml`)
4. ✅ Docker containerization (fallback)
5. ✅ Database migration automation
6. ✅ Environment variable documentation
7. ✅ Admin authentication middleware (Phase 1)
8. ✅ Health check with database status
9. ✅ Comprehensive deployment guide

### Next Steps (Manual - Outside This Plan):

1. **Follow `docs/DEPLOYMENT.md`** to deploy to Railway
2. **Configure DNS** for `api.yigyaps.com`
3. **Test all endpoints** after deployment
4. **Monitor Railway logs** for first 24 hours

### Estimated Time to Deploy:

- Railway setup: ~15 minutes
- DNS propagation: ~10 minutes
- Testing and verification: ~10 minutes
- **Total: ~35 minutes**

---

## Verification Commands (Post-Deployment)

After deploying to Railway, run these commands to verify:

```bash
# Health check
curl https://api.yigyaps.com/v1/health | jq

# MCP discovery
curl https://api.yigyaps.com/.well-known/mcp.json | jq

# Package listing (should be empty initially)
curl https://api.yigyaps.com/v1/packages | jq

# Authenticated package creation (replace YOUR_ADMIN_SECRET)
curl -X POST https://api.yigyaps.com/v1/packages \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "hello-world-skill",
    "version": "1.0.0",
    "displayName": "Hello World Skill",
    "description": "A simple test skill",
    "author": "yigyaps-team",
    "authorName": "YigYaps Team"
  }'
```

All commands should return successful responses.
