# @yigyaps/client

Official TypeScript/JavaScript SDK for the [YigYaps](https://yigyaps.com) open skill marketplace.

## Install

```bash
npm install @yigyaps/client
```

## Quick Start

### Invoke a skill (EVR pipeline)

```typescript
import { YigYapsSecurityClient } from "@yigyaps/client";

const client = new YigYapsSecurityClient({ apiKey: process.env.YIGYAPS_API_KEY });

const result = await client.invoke(
  "meeting-notes-extractor",
  "Sarah will finalize the roadmap by Friday. We decided to delay the launch."
);

console.log(result.conclusion);
// → "Action Items: Sarah → roadmap (due Friday). Decision: launch delayed."

console.log(result.evaluation_details?.overall_score); // 7
console.log(result.evaluation_details?.verdict);       // "recommend"
console.log(result.mode);                              // "local" | "hybrid"
console.log(result.privacy_notice);
// → "LOCAL MODE — Rules evaluated entirely in-process. No data transmitted."
```

### Search and install skills

```typescript
import { YigYapsRegistryClient } from "@yigyaps/client";

const registry = new YigYapsRegistryClient({ apiKey: process.env.YIGYAPS_API_KEY });

// Search
const { packages } = await registry.search({ query: "github", category: "development" });
console.log(packages.map(p => p.packageId));

// Install for an agent
await registry.install({
  packageId: "git-commit-reviewer",
  yigbotId: "my-agent-001",
});
```

### Publish a skill

```typescript
import { YigYapsPublisherClient } from "@yigyaps/client";

const publisher = new YigYapsPublisherClient({ apiKey: process.env.YIGYAPS_API_KEY });

await publisher.publishPackage({
  packageId: "my-skill",
  displayName: "My Skill",
  description: "What this skill does in one sentence.",
  authorName: "Your Name",
  category: "productivity",
  rules: [{ path: "rules/main.json", content: JSON.stringify([/* your rules */]) }],
});
```

## Connecting to Claude Desktop via MCP

The `@yigyaps/cli` package includes a `mcp-bridge` command that exposes any
marketplace skill as an MCP tool — no code required:

```bash
npx @yigyaps/cli mcp-bridge meeting-notes-extractor --api-key yyy_xxx
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "meeting-notes": {
      "command": "npx",
      "args": ["@yigyaps/cli", "mcp-bridge", "meeting-notes-extractor"],
      "env": { "YIGYAPS_API_KEY": "yyy_xxx" }
    }
  }
}
```

## Privacy Model

Skills on YigYaps use the **Encrypted Virtual Room (EVR)** pipeline:

| Mode | What happens |
|------|-------------|
| `local` | Rules evaluated 100% in-process. Zero external calls. |
| `hybrid` | Local Rule Engine + LLM language polishing. Only a score skeleton (no rule content) leaves the process. |
| `lab-preview-*` | Author-only preview with raw LLM inference. |

The `privacy_notice` field in every `SkillInvokeResult` explains exactly what
happened for that specific invocation.

## API Reference

### `YigYapsSecurityClient`

| Method | Description |
|--------|-------------|
| `invoke(packageId, userQuery, expertShare?)` | Invoke a skill and get a structured result |
| `encryptKnowledge(packageId, plaintextRules)` | Upload and encrypt skill rules |

### `YigYapsRegistryClient`

| Method | Description |
|--------|-------------|
| `search(query)` | Search the skill marketplace |
| `getByPackageId(packageId)` | Fetch skill metadata |
| `install(params)` | Install a skill for an agent |
| `getInstallations()` | List installed skills |
| `uninstall(id)` | Uninstall a skill |
| `getRules(packageId)` | Fetch public rules for a skill |
| `getMe()` | Get authenticated user profile |

### `YigYapsPublisherClient`

| Method | Description |
|--------|-------------|
| `publishPackage(params)` | Create a new skill package |
| `updatePackage(id, patch)` | Update an existing skill package |
| `mintLimitedEdition(params)` | Mint a limited-edition NFT for a skill |

## License

Apache 2.0 — see [LICENSE](../../LICENSE)
