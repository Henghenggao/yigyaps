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

const client = new YigYapsSecurityClient({
  apiKey: process.env.YIGYAPS_API_KEY,
});

const result = await client.invoke(
  "meeting-notes-extractor",
  "Sarah will finalize the roadmap by Friday. We decided to delay the launch.",
);

console.log(result.conclusion);
// → "Action Items: Sarah → roadmap (due Friday). Decision: launch delayed."

console.log(result.evaluation_details?.overall_score); // 7
console.log(result.evaluation_details?.verdict); // "recommend"
console.log(result.mode); // "local" | "hybrid"
console.log(result.privacy_notice);
// → "LOCAL MODE — Rules evaluated entirely in-process. No data transmitted."
```

### Search and install skills

```typescript
import { YigYapsRegistryClient } from "@yigyaps/client";

const registry = new YigYapsRegistryClient({
  apiKey: process.env.YIGYAPS_API_KEY,
});

// Search
const { packages } = await registry.search({
  query: "github",
  category: "development",
});
console.log(packages.map((p) => p.packageId));

// Install for an agent
await registry.install({
  packageId: "git-commit-reviewer",
  yigbotId: "my-agent-001",
});
```

### Publish a skill

```typescript
import { YigYapsPublisherClient } from "@yigyaps/client";

const publisher = new YigYapsPublisherClient({
  apiKey: process.env.YIGYAPS_API_KEY,
});

await publisher.publishPackage({
  packageId: "my-skill",
  displayName: "My Skill",
  description: "What this skill does in one sentence.",
  authorName: "Your Name",
  category: "productivity",
  rules: [
    {
      path: "rules/main.json",
      content: JSON.stringify([
        /* your rules */
      ]),
    },
  ],
});
```

---

## Framework Adapters (Phase 2)

Zero-dependency helpers that convert any YigYaps skill into the tool format
expected by popular LLM frameworks. No additional packages required.

### OpenAI / GPT-4o

```typescript
import OpenAI from "openai";
import { YigYapsSecurityClient, toOpenAITool } from "@yigyaps/client";

const yy = new YigYapsSecurityClient({ apiKey: process.env.YIGYAPS_API_KEY });
const openai = new OpenAI();
const tool = toOpenAITool(yy, "meeting-notes-extractor");

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  tools: [tool.schema],
  messages: [{ role: "user", content: "Summarise our last standup" }],
});

for (const call of response.choices[0].message.tool_calls ?? []) {
  const result = await tool.execute(JSON.parse(call.function.arguments));
  console.log(result.conclusion);
}
```

### Vercel AI SDK

```typescript
import { generateText, tool, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { YigYapsSecurityClient, toVercelAITool } from "@yigyaps/client";

const yy = new YigYapsSecurityClient({ apiKey: process.env.YIGYAPS_API_KEY });
const yyt = toVercelAITool(yy, "meeting-notes-extractor");

// Wrap the JSON Schema with jsonSchema() from the 'ai' package
const meetingTool = tool({ ...yyt, parameters: jsonSchema(yyt.parameters) });

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools: { meeting_notes: meetingTool },
  prompt: "Summarise our last standup notes",
});
```

### LangChain

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { YigYapsSecurityClient, toLangChainTool } from "@yigyaps/client";

const yy = new YigYapsSecurityClient({ apiKey: process.env.YIGYAPS_API_KEY });
const yyt = toLangChainTool(yy, "meeting-notes-extractor");

const lcTool = new DynamicStructuredTool({
  name: yyt.name,
  description: yyt.description,
  schema: z.object({ user_query: z.string() }),
  func: yyt.func,
});

const model = new ChatOpenAI({ model: "gpt-4o" }).bindTools([lcTool]);
const result = await model.invoke("Summarise our last standup notes");
```

### Google Gemini

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  YigYapsSecurityClient,
  toGeminiFunctionDeclaration,
} from "@yigyaps/client";

const yy = new YigYapsSecurityClient({ apiKey: process.env.YIGYAPS_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const tool = toGeminiFunctionDeclaration(yy, "meeting-notes-extractor");

const model = gemini.getGenerativeModel({
  model: "gemini-1.5-pro",
  tools: [{ functionDeclarations: [tool.declaration] }],
});

const chat = model.startChat();
const res = await chat.sendMessage("Summarise our last standup notes");

for (const part of res.response.candidates?.[0].content.parts ?? []) {
  if (part.functionCall) {
    const result = await tool.execute(
      part.functionCall.args as { user_query: string },
    );
    console.log(result.conclusion);
  }
}
```

### Claude (via Anthropic SDK)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { YigYapsSecurityClient, toOpenAITool } from "@yigyaps/client";

const yy = new YigYapsSecurityClient({ apiKey: process.env.YIGYAPS_API_KEY });
const claude = new Anthropic();
const tool = toOpenAITool(yy, "meeting-notes-extractor");

const response = await claude.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  tools: [
    {
      name: tool.schema.function.name,
      description: tool.schema.function.description,
      input_schema: tool.schema.function.parameters,
    },
  ],
  messages: [{ role: "user", content: "Summarise our last standup notes" }],
});

for (const block of response.content) {
  if (block.type === "tool_use") {
    const result = await tool.execute(block.input as { user_query: string });
    console.log(result.conclusion);
  }
}
```

---

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

| Mode            | What happens                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `local`         | Rules evaluated 100% in-process. Zero external calls.                                                   |
| `hybrid`        | Local Rule Engine + LLM language polishing. Only a score skeleton (no rule content) leaves the process. |
| `lab-preview-*` | Author-only preview with raw LLM inference.                                                             |

The `privacy_notice` field in every `SkillInvokeResult` explains exactly what
happened for that specific invocation.

## API Reference

### `YigYapsSecurityClient`

| Method                                        | Description                                |
| --------------------------------------------- | ------------------------------------------ |
| `invoke(packageId, userQuery, expertShare?)`  | Invoke a skill and get a structured result |
| `encryptKnowledge(packageId, plaintextRules)` | Upload and encrypt skill rules             |

### Framework Adapters

| Function                                                | Returns                | Description                                  |
| ------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| `toOpenAITool(client, packageId, desc?)`                | `YigYapsOpenAITool`    | OpenAI / GPT-4o function-calling tool        |
| `toVercelAITool(client, packageId, desc?)`              | `YigYapsVercelTool`    | Vercel AI SDK tool descriptor                |
| `toLangChainTool(client, packageId, desc?)`             | `YigYapsLangChainTool` | LangChain `DynamicStructuredTool` descriptor |
| `toGeminiFunctionDeclaration(client, packageId, desc?)` | `YigYapsGeminiTool`    | Google Gemini function declaration           |

### `YigYapsRegistryClient`

| Method                      | Description                    |
| --------------------------- | ------------------------------ |
| `search(query)`             | Search the skill marketplace   |
| `getByPackageId(packageId)` | Fetch skill metadata           |
| `install(params)`           | Install a skill for an agent   |
| `getInstallations()`        | List installed skills          |
| `uninstall(id)`             | Uninstall a skill              |
| `getRules(packageId)`       | Fetch public rules for a skill |
| `getMe()`                   | Get authenticated user profile |

### `YigYapsPublisherClient`

| Method                       | Description                            |
| ---------------------------- | -------------------------------------- |
| `publishPackage(params)`     | Create a new skill package             |
| `updatePackage(id, patch)`   | Update an existing skill package       |
| `mintLimitedEdition(params)` | Mint a limited-edition NFT for a skill |

## License

Apache 2.0 — see [LICENSE](../../LICENSE)
