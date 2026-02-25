# YigYaps

**The open marketplace for YAP skills** — MCP-compatible, community-governed, Apache 2.0.

YigYaps is an independent registry for YAP (Yet Another Plugin) skills used by MCP clients
including Claude Code, Cursor, Windsurf, and other AI platforms.

### 🌟 Vision: Human-to-Agent Skill Assetization

YigYaps extends beyond mere software utilities. Our vision is to **digitize and assetize human wisdom, experience, and identity (voice, likeness, personality)** into modular, licensed "skills" that can be authorized to AI Agents.

- **Wisdom & Experience**: Experts can package their unique insights and problem-solving methodologies as queryable MCP tools.
- **Identity Assets**: Individuals can license their digital twins—including verified voices and likenesses—for use by personal or corporate agents in a controlled, royalty-generating environment.
- **Economic Empowerment**: By turning human capability into on-chain/on-registry digital assets, YigYaps creates a sustainable economy where AI agents generate revenue for the humans they represent or learn from.

## 🚀 Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| Database | ✅ Live | PostgreSQL on Railway (5 tables, 12 indexes) |
| API Server | ✅ Live | `https://yigyapsapi-production.up.railway.app` |
| Health Check | ✅ Live | `https://yigyapsapi-production.up.railway.app/v1/health` |
| MCP Discovery | ✅ Live | `https://yigyapsapi-production.up.railway.app/.well-known/mcp.json` |
| Production Domain | 🔄 Pending | `api.yigyaps.com` (DNS setup required) |

**Railway Project**: easygoing-warmth
**Deployed**: 2026-02-25
**Build**: Docker (Multi-stage, Node.js 20-alpine)
**Authentication**: ADMIN_SECRET (Phase 1 MVP)

## 📦 Phase 1: MVP (Current - ✅ DEPLOYED)

### What's Live

- ✅ **Database**: PostgreSQL with full schema (5 tables: packages, installations, reviews, mints, royalty_ledger)
- ✅ **API Server**: Fastify REST API deployed on Railway (Docker)
- ✅ **Core Endpoints**: Package publishing, installation tracking, reviews, minting (all tested & working)
- ✅ **MCP Registry Discovery**: `/.well-known/mcp.json` endpoint (spec-compliant)
- ✅ **Health Monitoring**: `/v1/health` endpoint with database connectivity check
- ✅ **Authentication**: ADMIN_SECRET Bearer token authentication (Phase 1)
- ✅ **Security**: Helmet, CORS, Rate limiting configured

### What's Coming (Phase 2)

- 🔄 Custom domain setup (`api.yigyaps.com`) - Railway configured, DNS pending
- 🔄 GitHub OAuth integration (replace ADMIN_SECRET)
- 🔄 Frontend marketplace UI (@yigyaps/client published to npm)
- 🔄 User-specific API keys
- 🔄 Analytics dashboard

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or use Railway free tier)
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/yigyaps.git
cd yigyaps

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your DATABASE_URL

# 4. Run database migrations
npm run db:migrate

# 5. Build all packages
npm run build

# 6. Start the API server
npm run dev:api
```

The API will be available at `http://localhost:3000`.

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
NODE_ENV=development
```

## 📖 Documentation

- **Deployment Guide**: [`docs/railway-deployment.md`](docs/railway-deployment.md) - Complete Railway deployment walkthrough
- **Governance**: [`docs/governance.md`](docs/governance.md) - Community governance model
- **API Reference**: See "API Endpoints" section below

## Why Independent?

YigYaps is intentionally separated from its primary clients to prevent conflicts of interest:

- Platform developers publish skills to YigYaps the same way any third-party creator does — via HTTP API
- No single organization has database-level access or ranking privileges
- Governance is community-driven (see [governance.md](docs/governance.md))

This mirrors how Docker Hub, npmjs.com, and PyPI operate independently of their primary clients.

## Packages

| Package | Description |
|---------|-------------|
| [`@yigyaps/types`](packages/types) | Shared TypeScript types |
| [`@yigyaps/db`](packages/db) | Drizzle ORM schema and DALs |
| [`@yigyaps/api`](packages/api) | Fastify REST API server |
| [`@yigyaps/client`](packages/client) | TypeScript/JS SDK for consumers and publishers |

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start the API server (requires DATABASE_URL env var)
npm run dev:api
```

## API Endpoints

```
POST   /v1/packages              Publish a YAP skill package
GET    /v1/packages              Search and list packages
GET    /v1/packages/:id          Get package details
PATCH  /v1/packages/:id          Update a package
POST   /v1/installations         Install a package to an agent
DELETE /v1/installations/:id     Uninstall
GET    /v1/installations/agent/:id   List agent's active skills
POST   /v1/reviews               Submit a review
GET    /v1/reviews/:packageId    Get reviews
POST   /v1/mints                 Mint a limited edition
GET    /v1/mints/my-earnings     Creator earnings summary
GET    /.well-known/mcp.json     MCP Registry discovery
GET    /health                   Health check
```

## MCP Registry Discovery

YigYaps implements the MCP Registry standard, making it auto-discoverable:

```bash
curl https://yigyaps.com/.well-known/mcp.json
```

```json
{
  "registries": [{
    "name": "YigYaps",
    "description": "The open marketplace for YAP skills",
    "url": "https://api.yigyaps.com/v1",
    "version": "1.0.0"
  }]
}
```

## License

Apache 2.0 — see [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
