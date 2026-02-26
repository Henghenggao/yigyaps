/**
 * YigYaps Publisher Client — for Skill Creators and Yigstudio
 *
 * Used by Yigstudio Lab and external creators to publish skill packages
 * to the YigYaps registry. This is the HTTP API replacement for the
 * previous direct SkillPackageDAL.create() call.
 *
 * ADR-015 Phase 2: Yigstudio's `publishSkill` implementation uses this client.
 *
 * License: Apache 2.0
 */

import type { SkillPackage } from "@yigyaps/types";

export interface PublisherClientOptions {
  baseUrl?: string;
  apiKey: string;
}

export interface PublishPackageParams {
  packageId: string;
  version?: string;
  displayName: string;
  description: string;
  readme?: string;
  authorName: string;
  category: string;
  tags?: string[];
  maturity?: string;
  license?: string;
  mcpTransport?: string;
  mcpCommand?: string;
  mcpUrl?: string;
  repositoryUrl?: string;
  /** Quality score for provenance (from Yigstudio Lab) */
  qualityScore?: number;
  /** Evidence trace IDs (from Yigstudio session-end hook) */
  evidenceTraceIds?: string[];
  /** Skill rules files */
  rules?: { path: string; content: string }[];
}

export class YigYapsPublisherClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: PublisherClientOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.yigyaps.com";
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    };
  }

  async publishPackage(params: PublishPackageParams): Promise<SkillPackage> {
    const res = await fetch(`${this.baseUrl}/v1/packages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        packageId: params.packageId,
        version: params.version ?? "0.1.0",
        displayName: params.displayName,
        description: params.description,
        readme: params.readme,
        authorName: params.authorName,
        category: params.category,
        tags: params.tags ?? [],
        maturity: params.maturity ?? "experimental",
        license: params.license ?? "open-source",
        mcpTransport: params.mcpTransport ?? "stdio",
        mcpCommand: params.mcpCommand,
        mcpUrl: params.mcpUrl,
        repositoryUrl: params.repositoryUrl,
        rules: params.rules ?? [],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps publishPackage failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<SkillPackage>;
  }

  async updatePackage(
    id: string,
    patch: Partial<PublishPackageParams>,
  ): Promise<SkillPackage> {
    const res = await fetch(`${this.baseUrl}/v1/packages/${id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps updatePackage failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<SkillPackage>;
  }

  async mintLimitedEdition(params: {
    skillPackageId: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    maxEditions?: number;
    creatorRoyaltyPercent?: number;
    graduationCertificate?: unknown;
  }): Promise<{ id: string; rarity: string; maxEditions: number | null }> {
    const res = await fetch(`${this.baseUrl}/v1/mints`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps mintLimitedEdition failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<{
      id: string;
      rarity: string;
      maxEditions: number | null;
    }>;
  }
}
