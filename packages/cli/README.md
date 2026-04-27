# @yigyaps/cli

> 🚀 **YigYaps CLI** — The Command-Line Gateway to the MCP Skill Marketplace

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](https://www.apache.org/licenses/LICENSE-2.0)

---

## Features

### 🎨 Premium Developer Experience

- **Brand-themed UI** — Gradient ASCII banner, color-coded output with consistent visual language
- **Interactive prompts** — Powered by `@clack/prompts` for beautiful, modern terminal interactions
- **Rich output components** — `skillCard`, `panel`, `keyValue` panels for structured information display
- **Smart suggestions** — Contextual next-step recommendations after every command

### 📦 Skill Management

- **Create** — `yigyaps init` scaffolds a new skill package with interactive wizard
- **Validate** — `yigyaps validate` checks manifest and rules structure
- **Publish** — `yigyaps publish` uploads skills to the YigYaps Registry
- **Search & Install** — Browse, preview, and install skills from the marketplace

### 🔌 MCP Integration

- **Local Sandbox** — `yigyaps dev` starts a local MCP server with hot-reload
- **Host Configuration** — `yigyaps mcp config` auto-configures Claude Desktop
- **Remote Skills** — `yigyaps run <id>` spins up a sandbox for any published skill

### 🧠 Interactive Mode

- Run `yigyaps` with no arguments for an **interactive main menu**
- First-time users get a **guided onboarding** flow (login + MCP setup)
- Automatic **update notifications** when a newer CLI version is available

---

## Installation

```bash
npm install -g @yigyaps/cli
```

## Quick Start

```bash
# Interactive mode (first run triggers onboarding)
yigyaps

# Create a new skill
yigyaps init my-skill

# Validate & publish
cd my-skill
yigyaps validate
yigyaps publish --dry-run

# Search & install
yigyaps search "twitter"
yigyaps info <package-id>
yigyaps install <package-id>

# Diagnostics
yigyaps doctor

# Prepare a Yigfinance+ETO handoff for a host runtime
yigyaps yap host prepare yigfinance \
  --host yigthinker \
  --host-version 0.3.1 \
  --mount-keys eto \
  --task "Review ETO project margin risk" \
  --output handoff.json
```

---

## Commands

| Command                  | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `yigyaps`                | Interactive main menu (or onboarding for first-time users) |
| `yigyaps init [name]`    | Create a new skill package                                 |
| `yigyaps validate`       | Validate skill package structure                           |
| `yigyaps publish`        | Publish to the YigYaps Registry                            |
| `yigyaps dev`            | Start local development sandbox                            |
| `yigyaps search [query]` | Search the skill registry                                  |
| `yigyaps info <id>`      | View detailed skill information                            |
| `yigyaps install <id>`   | Install a skill to an agent                                |
| `yigyaps uninstall <id>` | Remove an installation                                     |
| `yigyaps list`           | View installed skills                                      |
| `yigyaps status <id>`    | Check package status                                       |
| `yigyaps run <id>`       | Run a remote skill locally                                 |
| `yigyaps login`          | Authenticate with API key                                  |
| `yigyaps logout`         | Clear local credentials                                    |
| `yigyaps whoami`         | View account dashboard                                     |
| `yigyaps doctor`         | Run CLI diagnostics                                        |
| `yigyaps mcp config`     | Configure MCP host (Claude Desktop)                        |
| `yigyaps yap host prepare <yap>` | Prepare a remote YAP handoff for Yigthinker/add-in hosts |

---

## Architecture

```
src/
├── index.ts                    # Entry point + command registration
├── commands/
│   ├── init.ts                 # Interactive wizard
│   ├── login.ts / logout.ts    # Authentication
│   ├── validate.ts / publish.ts # Creator workflow
│   ├── search.ts / info.ts     # Discovery
│   ├── install.ts / uninstall.ts / list.ts  # Consumer workflow
│   ├── dev.ts / run.ts         # MCP sandbox
│   ├── doctor.ts / status.ts / whoami.ts    # Diagnostics
│   ├── mcp.ts                  # MCP host configuration
│   ├── interactive.ts          # Main menu (no-arg mode)
│   └── onboarding.ts           # First-run guided setup
├── lib/
│   ├── ui/
│   │   ├── theme.ts            # Brand colors & icons
│   │   ├── banner.ts           # ASCII art logo
│   │   ├── components.ts       # skillCard, panel, keyValue, skillListItem
│   │   └── prompts.ts          # @clack/prompts wrapper
│   ├── auth.ts                 # Authentication helpers
│   ├── config.ts               # CLI configuration (Conf)
│   ├── errors.ts               # Structured CLI errors
│   ├── logger.ts               # Themed console logger
│   ├── packager.ts             # Skill package bundler
│   ├── registry.ts             # API client factory
│   ├── sandbox.ts              # MCP skill sandbox
│   └── update-check.ts         # Version update notifications
```

---

## Development

```bash
# Build
npm run build -w @yigyaps/cli

# Test
npm run test -w @yigyaps/cli

# Watch mode
npm run dev -w @yigyaps/cli
```

---

## Tech Stack

| Category      | Technology                    |
| ------------- | ----------------------------- |
| Runtime       | Node.js >= 18                 |
| Language      | TypeScript 5.3                |
| CLI Framework | Commander.js                  |
| Prompts       | @clack/prompts                |
| Styling       | chalk, gradient-string, boxen |
| Links         | terminal-link                 |
| Updates       | update-notifier               |
| Config        | conf                          |
| Testing       | Vitest                        |

---

_License: Apache 2.0 | Part of the [YigYaps](https://yigyaps.com) ecosystem_
