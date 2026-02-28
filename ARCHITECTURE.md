# Architecture

## Package Structure

YigYaps is an npm workspaces monorepo. Packages are built and consumed in the following dependency order:

```
packages/types        (no internal deps)
    └── packages/db        (depends on: types)
            ├── packages/api       (depends on: db, types)
            └── packages/client    (depends on: types)
                    └── packages/cli   (depends on: client, types)
apps/web              (depends on: client)
```

### Package Responsibilities

| Package | Path | Description |
|---------|------|-------------|
| `@yigyaps/types` | `packages/types/` | Shared Zod schemas and TypeScript interfaces used across all packages |
| `@yigyaps/db` | `packages/db/` | Drizzle ORM schema + Data Access Layer (DAL) modules. All DB queries go through typed DALs |
| `@yigyaps/api` | `packages/api/` | Fastify HTTP server with 11 route modules, JWT auth, CSRF protection, and rate limiting |
| `@yigyaps/client` | `packages/client/` | JavaScript/TypeScript SDK for interacting with the registry API |
| `@yigyaps/cli` | `packages/cli/` | 17-command CLI for skill creators (`yigyaps publish`, `yigyaps mcp-bridge`, etc.) |
| `web` | `apps/web/` | React 19 + Vite SPA — marketplace, publication wizard, admin dashboard |

---

## Data Flow

```
Browser/Agent
    │
    ▼
apps/web (Vite SPA, port 5173)
    │  REST + Cookie Auth
    ▼
packages/api (Fastify, port 3100)
    │  Typed DAL calls
    ▼
packages/db (Drizzle ORM)
    │  SQL
    ▼
PostgreSQL (port 5432)
```

The CLI uses `packages/client` to talk to the same API.

---

## API Route Modules

All routes live under `packages/api/src/routes/`:

| File | Prefix | Description |
|------|--------|-------------|
| `auth.ts` | `/v1/auth` | GitHub OAuth, JWT issue/refresh, logout |
| `packages.ts` | `/v1/packages` | CRUD for skill packages |
| `installations.ts` | `/v1/installations` | Install/uninstall tracking |
| `reviews.ts` | `/v1/reviews` | Community reviews |
| `mints.ts` | `/v1/mints` | Limited-edition NFT-like skill mints |
| `users.ts` | `/v1/users` | Profile, public user lookup |
| `api-keys.ts` | `/v1/auth/api-keys` | API key CRUD (SHA-256 hashed) |
| `security.ts` | `/v1/security` | Skill execution, invocation metering |
| `admin.ts` | `/v1/admin` | Platform moderation (admin only) |
| `export.ts` | `/v1/export` | SKILL.md format export |
| `stripe.ts` | `/v1/stripe` | Stripe Connect onboarding + webhooks |

---

## Database Schema (9 tables, `yy_` prefix)

```
yy_users              — GitHub OAuth profiles, tier, role
yy_sessions           — HTTP session store
yy_api_keys           — SHA-256 hashed API keys + expiry
yy_skill_packages     — Skill metadata + encrypted rules (DEK)
yy_skill_rules        — Versioned rule rows (AES-256-GCM)
yy_skill_mints        — Limited-edition mint records
yy_skill_package_installations — Agent install tracking
yy_skill_package_reviews       — Community reviews
yy_royalty_ledger     — Immutable per-invocation earnings (70% creator)
yy_encrypted_knowledge — EVR knowledge vault rows
yy_invocation_logs    — Audit trail (hash-chained)
yy_ip_registrations   — IP timestamp evidence
yy_shamir_shares      — Shamir (2,3) key-split shares
yy_reports            — Content moderation reports
yy_subscriptions      — Subscription plans
yy_usage_ledger       — Metered usage records
```

Migrations live in `packages/db/migrations/` (0000–0011).

---

## Security Layers

```
Request
  │
  ├─ 1. Helmet CSP + CORS origin check
  ├─ 2. CSRF validation (origin + referer headers)
  ├─ 3. Rate limiting (per-IP, per-route tiers)
  ├─ 4. Authentication
  │       ├─ JWT cookie (httpOnly, 7-day)
  │       └─ API Key (SHA-256 hash comparison)
  ├─ 5. Authorization (role-based: user / admin)
  └─ 6. Encryption at rest (AES-256-GCM envelope)
           ├─ Per-skill DEK (Data Encryption Key)
           └─ KEK (Key Encryption Key) from env / KMS
```

---

## Authentication Flow

```
Browser                    API                     GitHub
   │                        │                        │
   │── GET /v1/auth/github ─►│                        │
   │                        │── OAuth redirect ──────►│
   │                        │◄─ code ────────────────│
   │                        │── exchange code ───────►│
   │                        │◄─ access_token ─────────│
   │                        │── fetch /user ─────────►│
   │                        │◄─ profile ──────────────│
   │                        │── upsert user in DB     │
   │◄── Set-Cookie: jwt ────│                        │
   │    (httpOnly, 7 days)   │                        │
```

API keys follow the same `requireAuth()` middleware path but via SHA-256 hash lookup instead of JWT verification.
