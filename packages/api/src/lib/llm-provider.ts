/**
 * YigYaps LLM Provider Abstraction
 *
 * Provides a clean interface for LLM inference, with AnthropicProvider
 * as the default implementation using the Claude API.
 *
 * License: Apache 2.0
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Types ────────────────────────────────────────────────────────────────

export interface LLMCompletionParams {
  system: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
}

export interface LLMCompletionResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LLMProvider {
  generateCompletion(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}

// ── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_TIMEOUT_MS = 30_000;

// ── AnthropicProvider ────────────────────────────────────────────────────

export interface AnthropicProviderConfig {
  apiKey: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
  timeoutMs?: number;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private timeoutMs: number;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    this.defaultMaxTokens = config.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async generateCompletion(
    params: LLMCompletionParams,
  ): Promise<LLMCompletionResult> {
    const model = params.model ?? this.defaultModel;
    const maxTokens = params.maxTokens ?? this.defaultMaxTokens;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system: params.system,
          messages: [{ role: "user", content: params.userMessage }],
        },
        { signal: controller.signal },
      );

      // Extract text from content blocks
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      return {
        text,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message?.includes("abort"))
      ) {
        throw new Error(
          `LLM request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
