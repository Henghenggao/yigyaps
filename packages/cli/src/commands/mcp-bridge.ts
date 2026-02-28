/**
 * YigYaps CLI — mcp-bridge command
 *
 * Usage:
 *   yigyaps mcp-bridge <skillId> [--api-key yyy_xxx] [--api-url https://api.yigyaps.com]
 *
 * Starts an MCP stdio server that proxies calls to a remote YigYaps skill.
 * Any MCP-compatible host (Claude Desktop, Cursor, Codex) can use this bridge
 * to invoke a marketplace skill without embedding YigYaps-specific code.
 *
 * Flow:
 *   MCP host → tool_call → bridge → POST /v1/security/invoke/:skillId → conclusion
 *
 * License: Apache 2.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig } from "../lib/config.js";

interface BridgeOptions {
  apiKey?: string;
  apiUrl?: string;
}

interface SkillMeta {
  id: string;
  packageId: string;
  displayName: string;
  description: string;
  version: string;
}

interface InvokeResponse {
  conclusion?: string;
  error?: string;
  mode?: string;
}

/**
 * Derives a valid MCP tool name from the skillId.
 * MCP tool names must be [a-zA-Z0-9_-] only.
 */
function toToolName(skillId: string): string {
  return skillId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

/** 30-second timeout for all outbound HTTP requests */
const FETCH_TIMEOUT_MS = 30_000;

export async function mcpBridgeCommand(
  skillId: string,
  options: BridgeOptions,
) {
  // ── Validate skillId format ─────────────────────────────────────────────────
  if (!skillId || skillId.length > 256) {
    process.stderr.write(
      `[yigyaps mcp-bridge] Invalid skillId: must be 1-256 characters.\n`,
    );
    process.exit(1);
  }

  const config = getConfig();
  const apiKey = options.apiKey ?? config.apiKey;
  const apiUrl =
    options.apiUrl ??
    config.registryUrl ??
    "https://api.yigyaps.com";

  if (!apiKey) {
    // Write to stderr so the MCP host sees a clear error, not JSON noise
    process.stderr.write(
      "[yigyaps mcp-bridge] No API key found. " +
        "Run 'yigyaps login' first or pass --api-key <key>.\n",
    );
    process.exit(1);
  }

  // ── Fetch skill metadata (public endpoint, no auth needed) ───────────────
  let skillMeta: SkillMeta;
  try {
    const res = await fetch(
      `${apiUrl}/v1/packages/by-pkg/${encodeURIComponent(skillId)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    skillMeta = (await res.json()) as SkillMeta;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[yigyaps mcp-bridge] Failed to fetch skill metadata for "${skillId}": ${msg}\n`,
    );
    process.exit(1);
  }

  const toolName = toToolName(skillId);

  // ── Build MCP server ──────────────────────────────────────────────────────
  const server = new Server(
    {
      name: `yigyaps-bridge-${toolName}`,
      version: skillMeta.version ?? "1.0.0",
    },
    { capabilities: { tools: {} } },
  );

  // ── tools/list ────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: toolName,
        description: `[YigYaps skill] ${skillMeta.displayName}: ${skillMeta.description}`,
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description:
                "Your question or scenario to evaluate with this skill",
            },
          },
          required: ["query"],
        },
      },
    ],
  }));

  // ── tools/call ────────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== toolName) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const query =
      (request.params.arguments as { query?: string })?.query ?? "";

    let data: InvokeResponse;
    try {
      const res = await fetch(
        `${apiUrl}/v1/security/invoke/${encodeURIComponent(skillId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ user_query: query }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      data = (await res.json()) as InvokeResponse;

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `[YigYaps Error ${res.status}] ${data.error ?? res.statusText}`,
            },
          ],
          isError: true,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `[YigYaps Network Error] ${msg}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: data.conclusion ?? "[No conclusion returned by skill]",
        },
      ],
    };
  });

  // ── Connect stdio transport and keep alive ────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // The process stays alive as long as the MCP client holds the connection.
}
