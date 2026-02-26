import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { PackagePayload } from "./packager.js";

/**
 * YigYaps Local Sandbox Server
 *
 * A simple MCP server that exposes the skill's rules as a tool.
 */
export class SkillSandbox {
  private server: Server;
  private payload: PackagePayload;

  constructor(payload: PackagePayload) {
    this.payload = payload;
    this.server = new Server(
      {
        name: `yigyaps-sandbox-${payload.manifest.name}`,
        version: payload.manifest.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tool: Tool = {
        name: "get_skill_context",
        description: `Get the system prompt and rules for the '${this.payload.manifest.name}' skill.`,
        inputSchema: {
          type: "object",
          properties: {},
        },
      };
      return { tools: [tool] };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "get_skill_context") {
        const rulesContent = this.payload.rules
          .map((r) => `--- ${r.path} ---\n${r.content}`)
          .join("\n\n");

        const context = `
Skill: ${this.payload.manifest.name}
Description: ${this.payload.manifest.description}

Rules & Instructions:
${rulesContent}
        `.trim();

        return {
          content: [
            {
              type: "text",
              text: context,
            },
          ],
        };
      }
      throw new Error(`Tool not found: ${request.params.name}`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Note: Stdio transport uses process.stdin/stdout.
    // In our CLI, we should be careful about other logging.
  }

  updatePayload(payload: PackagePayload) {
    this.payload = payload;
  }
}
