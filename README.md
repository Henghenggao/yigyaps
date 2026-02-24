# YigYaps

**The open marketplace for YAP skills** — MCP-compatible, community-governed, Apache 2.0.

YigYaps is an independent registry for YAP (Yet Another Plugin) skills used by MCP clients
including Yigcore, Claude Code, Cursor, Windsurf, and others.

## Why Independent?

YigYaps is intentionally separated from Yigcore to prevent conflicts of interest:

- Yigcore publishes skills to YigYaps the same way any third-party creator does — via HTTP API
- No single company has database-level access or ranking privileges
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
POST   /v1/installations         Install a package to a Yigbot
DELETE /v1/installations/:id     Uninstall
GET    /v1/installations/yigbot/:id  List Yigbot's active skills
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
