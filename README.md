# YigYaps

**The open marketplace for YAP skills** — MCP-compatible, community-governed, Apache 2.0.

YigYaps is an independent registry for YAP (Yet Another Plugin) skills used by MCP clients
including Claude Code, Cursor, Windsurf, and other AI platforms.

## 🌟 Vision: Human-to-Agent Skill Assetization

YigYaps extends beyond mere software utilities. Our vision is to **digitize and assetize human wisdom, experience, and identity (voice, likeness, personality)** into modular, licensed "skills" that can be authorized to AI Agents.

- **Wisdom & Experience**: Experts can package their unique insights and problem-solving methodologies as queryable MCP tools.
- **Identity Assets**: Individuals can license their digital twins—including verified voices and likenesses—for use by personal or corporate agents in a controlled, royalty-generating environment.
- **Economic Empowerment**: By turning human capability into on-chain/on-registry digital assets, YigYaps creates a sustainable economy where AI agents generate revenue for the humans they represent or learn from.

## 💻 Tech Stack

YigYaps is built with a modern, scalable TypeScript stack:

- **Monorepo**: npm workspaces
- **API Server**: Fastify (Node.js) for high-performance REST APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React (Vite) with Tailwind CSS
- **Testing**: Vitest for unit and integration tests
- **Containerization**: Docker multi-stage builds

## 🛠️ Local Development & Deployment

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+ (or use a cloud provider)
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/yigyaps.git
cd yigyaps

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Copy .env.example to .env and configure your DATABASE_URL
cp .env.example .env

# 4. Run database migrations
npm run db:migrate --workspace=packages/db

# 5. Build all packages
npm run build

# 6. Start the development servers
# Start the API server (Available at http://localhost:3000)
npm run dev:api

# In a new terminal, start the web frontend (Available at http://localhost:5173)
npm run dev --workspace=apps/web
```

### Packages Architecture

| Package | Description |
|---------|-------------|
| [`@yigyaps/types`](packages/types) | Shared TypeScript interfaces and Zod schemas |
| [`@yigyaps/db`](packages/db) | Drizzle ORM schema and database access layer |
| [`@yigyaps/api`](packages/api) | Fastify REST API server |
| [`@yigyaps/client`](packages/client) | TypeScript/JS SDK for consumers and publishers |
| [`@yigyaps/web`](apps/web) | React frontend marketplace interface |

## 🤝 Why Independent?

YigYaps is intentionally separated from its primary clients to prevent conflicts of interest:

- Platform developers publish skills to YigYaps the same way any third-party creator does — via HTTP API
- No single organization has database-level access or ranking privileges
- Governance is community-driven

This mirrors how Docker Hub, npmjs.com, and PyPI operate independently of their primary clients.

## 📄 License & Contributing

- **License**: Apache 2.0 — see [LICENSE](LICENSE)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
