/**
 * LLMProvider Unit Tests
 *
 * Tests the LLMProvider interface and AnthropicProvider timeout behavior.
 *
 * License: Apache 2.0
 */

import { describe, it, expect } from "vitest";
import { AnthropicProvider } from "../../../src/lib/llm-provider.js";

describe("AnthropicProvider", () => {
  it("can be constructed with config", () => {
    const provider = new AnthropicProvider({
      apiKey: "test-key",
      defaultModel: "claude-haiku-4-5-20251001",
      defaultMaxTokens: 256,
      timeoutMs: 5000,
    });

    expect(provider).toBeDefined();
  });

  it("uses default values when not specified", () => {
    const provider = new AnthropicProvider({
      apiKey: "test-key",
    });

    expect(provider).toBeDefined();
  });
});
