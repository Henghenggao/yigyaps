# <img src="./logo.png" width="32" height="32" /> YigYaps: The Open Skill Registry

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Stage](https://img.shields.io/badge/Stage-Alpha-orange.svg)](https://yigyaps.com)
[![Protocol](https://img.shields.io/badge/Protocol-MCP-green.svg)](https://modelcontextprotocol.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Empowering Humans in the Agent Economy.** YigYaps is an independent, community-governed registry for YAP (Yet Another Plugin) skills, fully compatible with the [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

---

## 🌟 The Vision: Human-to-Agent Assetization

YigYaps is built on the belief that **Human Expertise is the most valuable asset in the AI era**. We are moving beyond "Prompt Engineering" to **"Skill Infrastructure"**.

- **Wisdom Digitization**: Transform unique professional methodologies into modular, queryable MCP tools.
- **Identity Licensing**: Securely license digital twins—including verified voice and likeness—for authorized agent use.
- **Economic Sovereignty**: A sustainable economy where agents pay per-call royalties back to the humans they learn from.

---

## 🛠️ Security & Engineering Excellence

YigYaps is engineered for **Security-First IP Protection**. We solve the "Knowledge Theft" problem through rigorous engineering:

### 🛡️ Expert IP Defense (Envelope Encryption)
*   **Data at Rest**: All sensitive expertise is protected via **AES-256-GCM Envelope Encryption**.
*   **KMS Integration**: Master keys (KEK) are managed separately from the database, ensuring that even a database breach won't expose creator knowledge.
*   **Ephemeral Decryption**: Rules are only decrypted in memory during active tool execution and are immediately zeroed out.

### 💻 Developer Experience (Premium CLI)
The `yigyaps` CLI provides a world-class workflow for skill creators:
*   **Interactive Onboarding**: Guided setup using modern, beautiful terminal prompts.
*   **Validation Suite**: Built-in logic to verify MCP compliance before publishing.
*   **Doctor Mode**: Self-diagnostic tool to ensure your environment is configured correctly.

---

## 💻 Tech Stack

- **Framework**: [Fastify](https://www.fastify.io/) (API) + [React](https://react.dev/) / [Vite](https://vitejs.dev/) (Web)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Communication**: [Model Context Protocol](https://modelcontextprotocol.io)
- **Security**: AES-256-GCM, GitHub OAuth, JWT, Tiered Rate Limiting.
- **Ops**: Docker Multi-stage builds, Railway CI/CD.

---

## 🚀 Local Development

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ | Use `nvm use` — `.nvmrc` is included |
| npm | 10+ | Bundled with Node 20 |
| PostgreSQL | 14+ | Local install **or** Docker Compose |
| Docker Desktop | Latest | **Required** to run the test suite |
| GitHub OAuth App | — | [See setup guide](#github-oauth-setup) |

### Option A — Local PostgreSQL

```bash
# 1. Clone and install
git clone https://github.com/Henghenggao/yigyaps.git
cd yigyaps
nvm use          # switches to Node 20 via .nvmrc
npm install

# 2. Create a local database
createdb yigyaps_dev

# 3. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

# 4. Run migrations and build
npm run db:migrate
npm run build

# 5. Start servers
npm run dev:api                  # API  → http://localhost:3100
npm run dev --workspace=web      # Web  → http://localhost:5173
```

### Option B — Docker Compose

```bash
git clone https://github.com/Henghenggao/yigyaps.git
cd yigyaps
cp .env.example .env
# Edit .env: set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

docker compose up -d
# Web: http://localhost:5173 | API: http://localhost:3100 | Swagger: http://localhost:3100/docs
```

### Running Tests

> **Requires Docker Desktop to be running.** Tests use [Testcontainers](https://testcontainers.com/) to start a temporary PostgreSQL instance automatically.

```bash
npm test                              # all 128 tests
npm test --workspace=packages/api     # API tests (78)
npm test --workspace=packages/db      # DB tests  (19) — runs serially
npm test --workspace=apps/web         # Web tests (31)
npm run test:coverage                 # with coverage report
```

### Useful Scripts

```bash
npm run build          # build all packages
npm run lint           # ESLint across the monorepo
npm run db:migrate     # apply pending migrations
npm run db:generate    # generate new migration from schema changes
npm run db:studio      # open Drizzle Studio (visual DB browser)
```

<details id="github-oauth-setup">
<summary>🔑 GitHub OAuth Setup</summary>

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → **New OAuth App**.
2. **Homepage URL**: `http://localhost:5173`
3. **Authorization callback URL**: `http://localhost:3100/v1/auth/github/callback`
4. Copy **Client ID** and generate a **Client Secret**, then paste both into your `.env`.
</details>

---

## 🏗️ Monorepo Architecture

| Module | NPM Scope | Description |
| :--- | :--- | :--- |
| **[Types](./packages/types)** | `@yigyaps/types` | Shared Zod schemas & interfaces |
| **[Database](./packages/db)** | `@yigyaps/db` | Drizzle Schema & Data Access Layer |
| **[API](./packages/api)** | `@yigyaps/api` | Fastify secure backend |
| **[CLI](./packages/cli)** | `@yigyaps/cli` | Developer toolkit & publisher |
| **[Web](./apps/web)** | `web` | Multi-step publication wizard & marketplace |

---

## 🤝 The Independence Pledge

YigYaps is an **Independent Registry**. Unlike platform-tied stores, we prioritize:
- **Neutrality**: No preferential ranking for specific model providers.
- **Portability**: Skills published here work across Claude, Cursor, Windsurf, and any future MCP client.
- **Community Governance**: Rejection and removal decisions are public and auditable.

---

## 📄 License & Contributing

- **License**: [Apache 2.0](LICENSE)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)

---
<p align="center">Built with ❤️ for the future of Human-AI Collaboration.</p>
