/**
 * YigYaps Registry Client — for Skill Consumers
 *
 * Used by MCP clients (Yigcore, Claude Code, Cursor, etc.) to search
 * and retrieve skill packages from the YigYaps registry.
 *
 * License: Apache 2.0
 */

import type {
  SkillPackage,
  SkillPackageSearchQuery,
  SkillPackageSearchResult,
  McpRegistryDiscovery,
} from "@yigyaps/types";

export interface RegistryClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export class YigYapsRegistryClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: RegistryClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.yigyaps.com";
    this.headers = {
      "Content-Type": "application/json",
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    };
  }

  async getDiscovery(): Promise<McpRegistryDiscovery> {
    const res = await fetch(`${this.baseUrl}/.well-known/mcp.json`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`YigYaps discovery failed: ${res.status}`);
    return res.json() as Promise<McpRegistryDiscovery>;
  }

  async search(
    query: SkillPackageSearchQuery,
  ): Promise<SkillPackageSearchResult> {
    const params = new URLSearchParams();
    if (query.query) params.set("query", query.query);
    if (query.category) params.set("category", query.category);
    if (query.license) params.set("license", query.license);
    if (query.maturity) params.set("maturity", query.maturity);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.limit != null) params.set("limit", String(query.limit));
    if (query.offset != null) params.set("offset", String(query.offset));

    const res = await fetch(`${this.baseUrl}/v1/packages?${params}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`YigYaps search failed: ${res.status}`);
    return res.json() as Promise<SkillPackageSearchResult>;
  }

  async getById(id: string): Promise<SkillPackage> {
    const res = await fetch(`${this.baseUrl}/v1/packages/${id}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`YigYaps getById failed: ${res.status}`);
    return res.json() as Promise<SkillPackage>;
  }

  async getByPackageId(packageId: string): Promise<SkillPackage> {
    const res = await fetch(
      `${this.baseUrl}/v1/packages/by-pkg/${encodeURIComponent(packageId)}`,
      { headers: this.headers },
    );
    if (!res.ok) throw new Error(`YigYaps getByPackageId failed: ${res.status}`);
    return res.json() as Promise<SkillPackage>;
  }

  async install(params: {
    packageId: string;
    yigbotId: string;
    userTier?: string;
    configuration?: Record<string, unknown>;
  }): Promise<{ id: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/v1/installations`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps install failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<{ id: string; status: string }>;
  }
}
