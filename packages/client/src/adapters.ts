/**
 * YigYaps Framework Adapters — Phase 2
 *
 * Zero-dependency helpers that convert any YigYaps skill into the tool format
 * expected by popular LLM frameworks.
 *
 * Supported targets
 * -----------------
 * • OpenAI  — `toOpenAITool()`  → pass `.schema` to `tools:` array; call `.execute()` in the handler
 * • Vercel AI SDK — `toVercelAITool()` → spread into `tool({ ...t, parameters: jsonSchema(t.parameters) })`
 * • LangChain — `toLangChainTool()` → pass to `DynamicStructuredTool` or use `.invoke()` directly
 * • Google Gemini — `toGeminiFunctionDeclaration()` → pass to `tools: [{ functionDeclarations: [...] }]`
 *
 * All helpers share the same JSON Schema for skill arguments:
 *   { type: "object", properties: { user_query: { type: "string" } }, required: ["user_query"] }
 *
 * License: Apache 2.0
 */

import type { YigYapsSecurityClient } from "./security-client.js";
import type { SkillInvokeResult } from "@yigyaps/types";

// ─── Shared JSON Schema ───────────────────────────────────────────────────────

/** JSON Schema for a single-argument skill tool call */
export interface SkillToolParameters {
  type: "object";
  properties: {
    user_query: {
      type: "string";
      description: string;
    };
  };
  required: ["user_query"];
}

function makeParameters(queryDescription: string): SkillToolParameters {
  return {
    type: "object",
    properties: {
      user_query: {
        type: "string",
        description: queryDescription,
      },
    },
    required: ["user_query"],
  };
}

/** Sanitise a packageId to a valid OpenAI / Gemini function name (a-z A-Z 0-9 _ -) */
function toFunctionName(packageId: string): string {
  return packageId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

/** OpenAI `ChatCompletionTool`-compatible schema */
export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: SkillToolParameters;
  };
}

/**
 * A YigYaps-wrapped OpenAI tool.
 *
 * @example
 * const tool = toOpenAITool(client, "meeting-notes-extractor");
 *
 * const response = await openai.chat.completions.create({
 *   model: "gpt-4o",
 *   tools: [tool.schema],
 *   messages: [{ role: "user", content: "summarise our last standup" }],
 * });
 *
 * // Handle tool_calls
 * for (const call of response.choices[0].message.tool_calls ?? []) {
 *   const result = await tool.execute(JSON.parse(call.function.arguments));
 *   console.log(result.conclusion);
 * }
 */
export interface YigYapsOpenAITool {
  /** Pass this object inside the `tools` array of a chat completion request */
  schema: OpenAIToolDefinition;
  /** Invoke the skill with the arguments parsed from a tool_call message */
  execute(args: { user_query: string }): Promise<SkillInvokeResult>;
}

/**
 * Convert a YigYaps skill into an OpenAI function-calling tool.
 *
 * @param client      An authenticated `YigYapsSecurityClient`
 * @param packageId   The skill's packageId (e.g. "meeting-notes-extractor")
 * @param description Override for the tool description (defaults to packageId)
 * @param queryDescription Override for the `user_query` parameter description
 */
export function toOpenAITool(
  client: YigYapsSecurityClient,
  packageId: string,
  description?: string,
  queryDescription = "The text content or question to evaluate against the skill",
): YigYapsOpenAITool {
  return {
    schema: {
      type: "function",
      function: {
        name: toFunctionName(packageId),
        description: description ?? `Invoke the "${packageId}" YigYaps skill`,
        parameters: makeParameters(queryDescription),
      },
    },
    execute: ({ user_query }) => client.invoke(packageId, user_query),
  };
}

// ─── Vercel AI SDK ───────────────────────────────────────────────────────────

/**
 * A plain-object tool compatible with the Vercel AI SDK's `tool()` helper.
 *
 * @example
 * import { tool, jsonSchema } from "ai";
 *
 * const yy = toVercelAITool(client, "meeting-notes-extractor");
 * const aiTool = tool({ ...yy, parameters: jsonSchema(yy.parameters) });
 *
 * const { text } = await generateText({
 *   model: openai("gpt-4o"),
 *   tools: { meeting_notes: aiTool },
 *   prompt: "Summarise our last standup",
 * });
 */
export interface YigYapsVercelTool {
  description: string;
  /** JSON Schema — wrap with `jsonSchema()` from the `ai` package before passing to `tool()` */
  parameters: SkillToolParameters;
  execute(args: { user_query: string }): Promise<SkillInvokeResult>;
}

/**
 * Convert a YigYaps skill into a Vercel AI SDK tool descriptor.
 *
 * @param client      An authenticated `YigYapsSecurityClient`
 * @param packageId   The skill's packageId
 * @param description Override for the tool description
 * @param queryDescription Override for the `user_query` parameter description
 */
export function toVercelAITool(
  client: YigYapsSecurityClient,
  packageId: string,
  description?: string,
  queryDescription = "The text content or question to evaluate against the skill",
): YigYapsVercelTool {
  return {
    description: description ?? `Invoke the "${packageId}" YigYaps skill`,
    parameters: makeParameters(queryDescription),
    execute: ({ user_query }) => client.invoke(packageId, user_query),
  };
}

// ─── LangChain ───────────────────────────────────────────────────────────────

/**
 * A plain-object tool compatible with LangChain's `DynamicStructuredTool`.
 *
 * @example
 * import { DynamicStructuredTool } from "@langchain/core/tools";
 * import { z } from "zod";
 *
 * const yy = toLangChainTool(client, "meeting-notes-extractor");
 * const lcTool = new DynamicStructuredTool({
 *   name: yy.name,
 *   description: yy.description,
 *   schema: z.object({ user_query: z.string() }),
 *   func: yy.func,
 * });
 */
export interface YigYapsLangChainTool {
  name: string;
  description: string;
  /** JSON Schema for the tool inputs */
  schema: SkillToolParameters;
  /**
   * Invoke the skill and return the conclusion as a plain string.
   * Pass this directly to `DynamicStructuredTool({ func: ... })`.
   */
  func(args: { user_query: string }): Promise<string>;
}

/**
 * Convert a YigYaps skill into a LangChain-compatible tool descriptor.
 *
 * @param client      An authenticated `YigYapsSecurityClient`
 * @param packageId   The skill's packageId
 * @param description Override for the tool description
 * @param queryDescription Override for the `user_query` parameter description
 */
export function toLangChainTool(
  client: YigYapsSecurityClient,
  packageId: string,
  description?: string,
  queryDescription = "The text content or question to evaluate against the skill",
): YigYapsLangChainTool {
  return {
    name: packageId,
    description: description ?? `Invoke the "${packageId}" YigYaps skill`,
    schema: makeParameters(queryDescription),
    func: async ({ user_query }) => {
      const result = await client.invoke(packageId, user_query);
      return result.conclusion;
    },
  };
}

// ─── Google Gemini ───────────────────────────────────────────────────────────

/** Google Gemini `FunctionDeclaration`-compatible schema */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: SkillToolParameters;
}

/**
 * A YigYaps-wrapped Gemini function declaration.
 *
 * @example
 * import { GoogleGenerativeAI } from "@google/generative-ai";
 *
 * const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
 * const tool = toGeminiFunctionDeclaration(client, "meeting-notes-extractor");
 *
 * const model = gemini.getGenerativeModel({
 *   model: "gemini-1.5-pro",
 *   tools: [{ functionDeclarations: [tool.declaration] }],
 * });
 *
 * // After receiving a functionCall part:
 * const result = await tool.execute(part.functionCall.args);
 */
export interface YigYapsGeminiTool {
  /** Pass inside `tools: [{ functionDeclarations: [tool.declaration] }]` */
  declaration: GeminiFunctionDeclaration;
  /** Invoke the skill with the args from a `functionCall` part */
  execute(args: { user_query: string }): Promise<SkillInvokeResult>;
}

/**
 * Convert a YigYaps skill into a Google Gemini function declaration.
 *
 * @param client      An authenticated `YigYapsSecurityClient`
 * @param packageId   The skill's packageId
 * @param description Override for the tool description
 * @param queryDescription Override for the `user_query` parameter description
 */
export function toGeminiFunctionDeclaration(
  client: YigYapsSecurityClient,
  packageId: string,
  description?: string,
  queryDescription = "The text content or question to evaluate against the skill",
): YigYapsGeminiTool {
  return {
    declaration: {
      name: toFunctionName(packageId),
      description: description ?? `Invoke the "${packageId}" YigYaps skill`,
      parameters: makeParameters(queryDescription),
    },
    execute: ({ user_query }) => client.invoke(packageId, user_query),
  };
}
