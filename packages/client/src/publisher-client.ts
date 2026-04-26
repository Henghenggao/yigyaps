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

import type {
  SkillPackage,
  SkillPack,
  SkillPackArtifact,
  SkillPackArtifactType,
  SkillPackSource,
  SkillPackStatus,
  SkillPackType,
  Yap,
  YapPackMountWithSkillPack,
  YapMountValidationResult,
  YapStatus,
  YapVisibility,
} from "@yigyaps/types";

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

export interface CreateYapParams {
  slug: string;
  version?: string;
  displayName: string;
  description: string;
  readme?: string;
  category?: string;
  tags?: string[];
  visibility?: YapVisibility;
  status?: Extract<YapStatus, "draft" | "active">;
  assemblyConfig?: Record<string, unknown>;
}

export interface CreateSkillPackArtifactParams {
  artifactType: SkillPackArtifactType;
  artifactPath: string;
  mediaType?: string;
  content: unknown;
}

export interface CreateSkillPackParams {
  name: string;
  version: string;
  displayName: string;
  description: string;
  packType?: SkillPackType;
  contractVersion?: string;
  compatibility?: Record<string, unknown>;
  manifest: Record<string, unknown>;
  source?: SkillPackSource;
  status?: Extract<SkillPackStatus, "draft" | "active">;
  artifacts?: CreateSkillPackArtifactParams[];
}

export interface CreateYapPackMountParams {
  skillPackId: string;
  mountKey: string;
  mountPoint?: string;
  displayName?: string;
  priority?: number;
  enabled?: boolean;
  required?: boolean;
  config?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
}

export interface UpdateYapPackMountParams {
  skillPackId?: string;
  mountKey?: string;
  mountPoint?: string;
  displayName?: string;
  priority?: number;
  enabled?: boolean;
  required?: boolean;
  config?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
}

export interface ValidateYapPackMountParams extends CreateYapPackMountParams {
  replacingMountId?: string;
}

export interface EncryptedKnowledgeUpload {
  success: boolean;
  message: string;
  expert_share: string;
  shamir_notice: string;
}

export type PublishPackageResult = SkillPackage & {
  encryptedKnowledge?: EncryptedKnowledgeUpload;
};

export class YigYapsApiError extends Error {
  constructor(
    operation: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`YigYaps ${operation} failed: ${status} ${JSON.stringify(body)}`);
    this.name = "YigYapsApiError";
  }
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

  async createYap(params: CreateYapParams): Promise<Yap> {
    const res = await fetch(`${this.baseUrl}/v1/yaps`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        slug: params.slug,
        version: params.version ?? "0.1.0",
        displayName: params.displayName,
        description: params.description,
        readme: params.readme,
        category: params.category ?? "other",
        tags: params.tags ?? [],
        visibility: params.visibility ?? "public",
        status: params.status ?? "active",
        assemblyConfig: params.assemblyConfig ?? {},
      }),
    });
    if (!res.ok) throw await toApiError("createYap", res);
    return res.json() as Promise<Yap>;
  }

  async getYapBySlug(slug: string): Promise<Yap> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/by-slug/${encodeURIComponent(slug)}`,
      { headers: this.headers },
    );
    if (!res.ok) throw await toApiError("getYapBySlug", res);
    return res.json() as Promise<Yap>;
  }

  async createSkillPack(
    yapIdOrSlug: string,
    params: CreateSkillPackParams,
  ): Promise<{ skillPack: SkillPack; artifacts: SkillPackArtifact[] }> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/skill-packs`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          name: params.name,
          version: params.version,
          displayName: params.displayName,
          description: params.description,
          packType: params.packType ?? "extension",
          contractVersion: params.contractVersion ?? "1.0",
          compatibility: params.compatibility ?? {},
          manifest: params.manifest,
          source: params.source ?? "manual",
          status: params.status ?? "active",
          artifacts: params.artifacts ?? [],
        }),
      },
    );
    if (!res.ok) throw await toApiError("createSkillPack", res);
    return res.json() as Promise<{
      skillPack: SkillPack;
      artifacts: SkillPackArtifact[];
    }>;
  }

  async listSkillPacks(
    yapIdOrSlug: string,
  ): Promise<{ skillPacks: SkillPack[]; total: number }> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/skill-packs`,
      { headers: this.headers },
    );
    if (!res.ok) throw await toApiError("listSkillPacks", res);
    return res.json() as Promise<{ skillPacks: SkillPack[]; total: number }>;
  }

  async createYapPackMount(
    yapIdOrSlug: string,
    params: CreateYapPackMountParams,
  ): Promise<YapPackMountWithSkillPack> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/mounts`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          skillPackId: params.skillPackId,
          mountKey: params.mountKey,
          mountPoint: params.mountPoint ?? "extensions",
          displayName: params.displayName,
          priority: params.priority ?? 100,
          enabled: params.enabled ?? true,
          required: params.required ?? false,
          config: params.config ?? {},
          constraints: params.constraints ?? {},
        }),
      },
    );
    if (!res.ok) throw await toApiError("createYapPackMount", res);
    return res.json() as Promise<YapPackMountWithSkillPack>;
  }

  async validateYapPackMount(
    yapIdOrSlug: string,
    params: ValidateYapPackMountParams,
  ): Promise<YapMountValidationResult> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/mount-validations`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          skillPackId: params.skillPackId,
          mountKey: params.mountKey,
          replacingMountId: params.replacingMountId,
          mountPoint: params.mountPoint ?? "extensions",
          displayName: params.displayName,
          priority: params.priority ?? 100,
          enabled: params.enabled ?? true,
          required: params.required ?? false,
          config: params.config ?? {},
          constraints: params.constraints ?? {},
        }),
      },
    );
    if (!res.ok) throw await toApiError("validateYapPackMount", res);
    return res.json() as Promise<YapMountValidationResult>;
  }

  async listYapPackMounts(
    yapIdOrSlug: string,
    query: { enabled?: boolean; limit?: number; offset?: number } = {},
  ): Promise<{
    mounts: YapPackMountWithSkillPack[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (query.enabled !== undefined) params.set("enabled", String(query.enabled));
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    if (query.offset !== undefined) params.set("offset", String(query.offset));
    const suffix = params.toString() ? `?${params}` : "";

    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/mounts${suffix}`,
      { headers: this.headers },
    );
    if (!res.ok) throw await toApiError("listYapPackMounts", res);
    return res.json() as Promise<{
      mounts: YapPackMountWithSkillPack[];
      total: number;
      limit: number;
      offset: number;
    }>;
  }

  async updateYapPackMount(
    yapIdOrSlug: string,
    mountId: string,
    patch: UpdateYapPackMountParams,
  ): Promise<YapPackMountWithSkillPack> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/mounts/${encodeURIComponent(mountId)}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) throw await toApiError("updateYapPackMount", res);
    return res.json() as Promise<YapPackMountWithSkillPack>;
  }

  async deleteYapPackMount(
    yapIdOrSlug: string,
    mountId: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/mounts/${encodeURIComponent(mountId)}`,
      {
        method: "DELETE",
        headers: this.headers,
      },
    );
    if (!res.ok) throw await toApiError("deleteYapPackMount", res);
  }

  async publishPackage(params: PublishPackageParams): Promise<PublishPackageResult> {
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
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `YigYaps publishPackage failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    const pkg = (await res.json()) as SkillPackage;

    if (!params.rules?.length) {
      return pkg;
    }

    const encryptedKnowledge = await this.uploadEncryptedKnowledge(
      params.packageId,
      serializeRulesForKnowledge(params.rules),
    );

    return {
      ...pkg,
      encryptedKnowledge,
    };
  }

  async uploadEncryptedKnowledge(
    packageId: string,
    plaintextRules: string,
  ): Promise<EncryptedKnowledgeUpload> {
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
        `YigYaps uploadEncryptedKnowledge failed: ${res.status} ${JSON.stringify(err)}`,
      );
    }
    return res.json() as Promise<EncryptedKnowledgeUpload>;
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

async function toApiError(
  operation: string,
  res: Response,
): Promise<YigYapsApiError> {
  const body = await res.json().catch(() => ({}));
  return new YigYapsApiError(operation, res.status, body);
}

function serializeRulesForKnowledge(
  rules: { path: string; content: string }[],
): string {
  if (rules.length === 1) {
    return rules[0].content;
  }

  return rules
    .map((rule) => `# ${rule.path}\n\n${rule.content}`)
    .join("\n\n---\n\n");
}
