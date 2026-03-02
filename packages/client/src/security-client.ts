/**
 * YigYaps Security Client — Encrypted Virtual Room (EVR) API
 *
 * Communicates with /v1/security to encrypt skill knowledge and
 * invoke skills through the local Rule Engine pipeline.
 *
 * License: Apache 2.0
 */

import type { SkillInvokeResult } from "@yigyaps/types";

export interface SecurityClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class YigYapsSecurityClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: SecurityClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.yigyaps.com";
    this.headers = {
      "Content-Type": "application/json",
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    };
  }

  /**
   * Encrypt plaintext rules for a skill package.
   * Rules are envelope-encrypted server-side; the plaintext is never stored.
   */
  async encryptKnowledge(
    packageId: string,
    plaintextRules: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(
      `${this.baseUrl}/v1/security/knowledge/${encodeURIComponent(packageId)}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ plaintextRules }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps encryptKnowledge failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<{ success: boolean; message: string }>;
  }

  /**
   * Invoke a skill through the Encrypted Virtual Room (EVR).
   *
   * The skill's rules are evaluated entirely in-process on the server
   * (LOCAL mode). If the platform has an Anthropic API key configured,
   * only a structured skeleton (scores + conclusion tokens) is sent to
   * the LLM for language polishing (HYBRID mode). Rule content is never
   * transmitted externally.
   *
   * @param packageId  The skill's packageId (e.g. "meeting-notes-extractor")
   * @param userQuery  The content or question to evaluate against the skill
   * @param expertShare  Optional Shamir share from the skill author (for
   *                     skills that require (2,3) threshold key reconstruction)
   */
  async invoke(
    packageId: string,
    userQuery: string,
    expertShare?: string,
  ): Promise<SkillInvokeResult> {
    const res = await fetch(
      `${this.baseUrl}/v1/security/invoke/${encodeURIComponent(packageId)}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          user_query: userQuery,
          ...(expertShare ? { expert_share: expertShare } : {}),
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps invoke failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<SkillInvokeResult>;
  }
}
