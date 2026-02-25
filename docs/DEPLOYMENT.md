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
