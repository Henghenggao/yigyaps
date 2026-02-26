# Contributing to YigYaps

YigYaps is an open marketplace for YAP skills, licensed under Apache 2.0.
We welcome contributions from all members of the MCP ecosystem community.

## Governance

YigYaps operates under an independent governance model designed to prevent
conflicts of interest (see ADR-014). Key principles:

1. No single organization has preferential ranking or visibility for their skills
2. Rejection decisions must have publicly recorded reasons
3. Featured/recommended positions must use publicly documented criteria
4. Forced removal requires 3/5 governance committee approval (emergency security excepted)

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Henghenggao/yigyaps.git
cd yigyaps

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Package Structure

| Package           | Scope             | Description                     |
| ----------------- | ----------------- | ------------------------------- |
| `packages/types`  | `@yigyaps/types`  | Shared TypeScript types         |
| `packages/db`     | `@yigyaps/db`     | Drizzle ORM schema and DALs     |
| `packages/api`    | `@yigyaps/api`    | Fastify REST API server         |
| `packages/client` | `@yigyaps/client` | TypeScript/JS SDK for consumers |
| `apps/web`        | —                 | yigyaps.com portal (Next.js)    |

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, etc.
4. Ensure `npm test` and `npm run build` pass
5. Open a pull request

## MCP Registry Standard

YigYaps implements the MCP Registry discovery standard via `.well-known/mcp.json`.
Any MCP client that supports registry discovery can automatically find YigYaps.

## Code of Conduct

Be respectful. Contributions that harm the community or exploit creators will be rejected.
