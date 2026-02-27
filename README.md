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

## 🚀 Quick Start (Local Deployment)

### 1. Requirements
- Node.js 20+ & npm 10+
- PostgreSQL 14+
- GitHub OAuth App [(Setup Guide)](#github-oauth-setup)

### 2. Setup
```bash
# Clone and install
git clone https://github.com/Henghenggao/yigyaps.git
cd yigyaps
npm install

# Environment
cp .env.example .env
# Edit .env with your DATABASE_URL and GitHub Credentials
```

### 3. Initialize & Run
```bash
# Run database migrations
npm run db:migrate

# Build core packages
npm run build

# Start API (http://localhost:3100)
npm run dev:api

# Start Web Frontend (http://localhost:5173)
npm run dev --workspace=web
```

<details id="github-oauth-setup">
<summary>🔑 GitHub OAuth Setup Details</summary>

1. Create a "New OAuth App" in [GitHub Developer Settings](https://github.com/settings/developers).
2. **Homepage URL**: `http://localhost:5173`
3. **Authorization callback URL**: `http://localhost:3100/v1/auth/github/callback`
4. Copy **Client ID** and **Client Secret** to your `.env`.
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
- **Contribution Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)

---
<p align="center">Built with ❤️ for the future of Human-AI Collaboration.</p>
