/**
 * YAP Remote Manifest Routes
 *
 * Provides a compact, cacheable contract for remote hosts that need to discover
 * and verify a YAP assembly before deciding whether to pull the full assembly
 * or request a runtime plan.
 *
 * License: Apache 2.0
 */

import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  SkillPackArtifactDAL,
  SkillPackDAL,
  YapDAL,
  YapPackMountDAL,
  type SkillPackRow,
  type YapRow,
} from "@yigyaps/db";
import type {
  RemoteHostCompatibilityStatus,
  RemoteYapManifest,
  RemoteYapManifestPackSummary,
  ResolvedYapManifest,
  ResolvedYapPack,
} from "@yigyaps/types";
import { optionalAuth } from "../middleware/auth-v2.js";
import { resolveYapAssembly } from "../lib/yap-assembly-resolver.js";
import { selectCoreSkillPack } from "../lib/yap-core-pack.js";
import { env } from "../lib/env.js";
import { satisfiesVersionRange } from "../lib/semver-compat.js";

const yapParamsSchema = z.object({
  yapId: z.string().min(1),
});

const remoteManifestQuerySchema = z.object({
  host: z.string().min(1).max(80).default("generic"),
  hostVersion: z.string().min(1).max(80).optional(),
  mountKeys: z
    .string()
    .max(1000)
    .optional()
    .transform((value) =>
      value
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  maxMounts: z.coerce.number().int().min(0).max(100).default(50),
});

type AccessUser = {
  userId: string;
  role: "user" | "admin";
};

function canReadYap(yap: YapRow, user?: AccessUser): boolean {
  if (user?.role === "admin" || user?.userId === yap.ownerId) return true;
  return yap.status === "active" && yap.visibility !== "private";
}

async function resolveYap(
  yapId: string,
  yapDAL: YapDAL,
): Promise<YapRow | null> {
  return yapId.startsWith("yap_")
    ? await yapDAL.getById(yapId)
    : await yapDAL.getBySlug(yapId);
}

export async function yapRemoteManifestRoutes(fastify: FastifyInstance) {
  const yapDAL = new YapDAL(fastify.db);
  const packDAL = new SkillPackDAL(fastify.db);
  const mountDAL = new YapPackMountDAL(fastify.db);
  const artifactDAL = new SkillPackArtifactDAL(fastify.db);

  fastify.get<{
    Params: { yapId: string };
    Querystring: {
      host?: string;
      hostVersion?: string;
      mountKeys?: string;
      maxMounts?: number;
    };
  }>(
    "/:yapId/remote-manifest",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const queryParsed = remoteManifestQuerySchema.safeParse(request.query);
      if (!paramsParsed.success || !queryParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.success
            ? queryParsed.error?.issues
            : paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      const maxMounts = queryParsed.data.maxMounts;
      const [skillPacks, mountsResult] = await Promise.all([
        packDAL.listByYap(yap.id),
        mountDAL.listByYap(yap.id, {
          enabled: true,
          limit: maxMounts,
          offset: 0,
        }),
      ]);

      if (mountsResult.total > maxMounts) {
        return reply.code(409).send({
          error: "Assembly has too many mounted packs",
          total: mountsResult.total,
          maxMounts,
        });
      }

      const requestedMountKeys = queryParsed.data.mountKeys ?? [];
      const mountedPacks =
        requestedMountKeys.length > 0
          ? mountsResult.mounts.filter(({ mount }) =>
              requestedMountKeys.includes(mount.mountKey),
            )
          : mountsResult.mounts;
      const resolvedMountKeys = new Set(
        mountedPacks.map(({ mount }) => mount.mountKey),
      );
      const missingMountKeys = requestedMountKeys.filter(
        (mountKey) => !resolvedMountKeys.has(mountKey),
      );
      if (missingMountKeys.length > 0) {
        return reply.code(422).send({
          error: "Mount keys not found",
          missingMountKeys,
        });
      }

      const corePack = selectCoreSkillPack(yap, skillPacks);
      if (!corePack) {
        return reply.code(409).send({
          error: "YAP core Skill Pack not found",
          yapId: yap.id,
        });
      }

      const [coreArtifacts, mountedArtifacts] = await Promise.all([
        artifactDAL.listBySkillPack(corePack.id),
        Promise.all(
          mountedPacks.map(({ skillPack }) =>
            artifactDAL.listBySkillPack(skillPack.id),
          ),
        ),
      ]);

      const assembly = resolveYapAssembly({
        yap,
        corePack: {
          role: "core",
          mount: null,
          skillPack: corePack,
          artifacts: coreArtifacts,
        },
        mountedPacks: mountedPacks.map((mounted, index) => ({
          role: "mount",
          mount: mounted.mount,
          skillPack: mounted.skillPack,
          artifacts: mountedArtifacts[index] ?? [],
        })),
      });

      const manifest = buildRemoteManifest({
        request,
        yap,
        assembly,
        targetHost: queryParsed.data.host,
        hostVersion: queryParsed.data.hostVersion ?? null,
        mountKeys: queryParsed.data.mountKeys ?? [],
      });

      if (request.headers["if-none-match"] === manifest.integrity.etag) {
        return reply.code(304).header("ETag", manifest.integrity.etag).send();
      }

      reply.header("ETag", manifest.integrity.etag);
      reply.header(
        "Cache-Control",
        yap.visibility === "public" ? "public, max-age=60" : "no-store",
      );
      return reply.send(manifest);
    },
  );
}

function buildRemoteManifest(input: {
  request: FastifyRequest;
  yap: YapRow;
  assembly: ResolvedYapManifest;
  targetHost: string;
  hostVersion: string | null;
  mountKeys: string[];
}): RemoteYapManifest {
  const baseUrl = baseUrlFor(input.request);
  const remoteManifestPath = endpointPath(
    input.yap.slug,
    "remote-manifest",
    input.mountKeys,
    input.targetHost,
    input.hostVersion,
  );
  const packSummaries = [
    packSummary(input.assembly.corePack, input.targetHost, input.hostVersion),
    ...input.assembly.mountedPacks.map((pack) =>
      packSummary(pack, input.targetHost, input.hostVersion),
    ),
  ];
  const assemblyVersionAt = Math.max(
    input.yap.updatedAt,
    input.assembly.corePack.skillPack.updatedAt,
    ...input.assembly.mountedPacks.flatMap((pack) => [
      pack.skillPack.updatedAt,
      pack.mount?.updatedAt ?? 0,
    ]),
  );

  const bodyWithoutIntegrity = {
    schemaVersion: "yigyaps.remote-manifest.v1" as const,
    product: {
      id: input.yap.id,
      slug: input.yap.slug,
      version: input.yap.version,
      displayName: input.yap.displayName,
      description: input.yap.description,
      category: input.yap.category,
      visibility: input.yap.visibility,
      status: input.yap.status,
      ownerName: input.yap.ownerName,
    },
    host: {
      target: input.targetHost,
      version: input.hostVersion,
      compatibility: {
        status: compatibilityStatus(packSummaries, input.targetHost),
        packs: packSummaries,
      },
    },
    remote: {
      baseUrl,
      endpoints: {
        assembly: `${baseUrl}${endpointPath(input.yap.slug, "assembly", input.mountKeys)}`,
        runtimePlan: `${baseUrl}${endpointPath(input.yap.slug, "runtime-plans", input.mountKeys)}`,
        remoteManifest: `${baseUrl}${remoteManifestPath}`,
      },
      invocationModes: ["local-plan", "hosted-plan"] as Array<
        "local-plan" | "hosted-plan"
      >,
    },
    assembly: {
      generatedAt: assemblyVersionAt,
      contractVersion: input.assembly.merged.contractVersion,
      corePack: packSummaries[0],
      mountedPacks: packSummaries.slice(1),
      packOrder: input.assembly.merged.packOrder,
      skillCount: input.assembly.merged.skills.length,
      routeCount: Object.keys(routeSkills(input.assembly)).length,
      toolMappingCount: Object.keys(toolMappings(input.assembly)).length,
      schemaCount: Object.keys(input.assembly.merged.schemas).length,
      qualityReportCount: input.assembly.merged.qualityReports.length,
      qualityGateStatus: qualityGateStatus(input.assembly.merged.qualityReports),
      conflictCount: input.assembly.diagnostics.conflicts.length,
      warningCount: input.assembly.diagnostics.warnings.length,
    },
    artifacts: {
      fetchMode: "assembly" as const,
      index: input.assembly.merged.artifactIndex,
    },
  };

  const manifestSha256 = sha256(stableStringify(bodyWithoutIntegrity));
  return {
    ...bodyWithoutIntegrity,
    integrity: {
      manifestSha256,
      etag: `"${manifestSha256}"`,
      generatedAt: Date.now(),
    },
  };
}

function packSummary(
  pack: ResolvedYapPack,
  targetHost: string,
  hostVersion: string | null,
): RemoteYapManifestPackSummary {
  const range = compatibilityRange(pack.skillPack, targetHost);
  return {
    id: pack.skillPack.id,
    name: pack.skillPack.name,
    version: pack.skillPack.version,
    packType: pack.skillPack.packType,
    contractVersion: pack.skillPack.contractVersion,
    artifactCount: pack.artifacts.artifactIndex.length,
    mountKey: pack.mount?.mountKey ?? null,
    mountPoint: pack.mount?.mountPoint ?? null,
    compatibility: {
      status: packCompatibilityStatus(range, hostVersion),
      range: range ?? null,
    },
  };
}

function compatibilityRange(
  skillPack: SkillPackRow,
  targetHost: string,
): string | undefined {
  const value = skillPack.compatibility[targetHost];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function compatibilityStatus(
  packs: RemoteYapManifestPackSummary[],
  targetHost: string,
): RemoteHostCompatibilityStatus {
  if (targetHost === "generic") return "unknown";
  if (packs.some((pack) => pack.compatibility.status === "incompatible")) {
    return "incompatible";
  }

  const compatibleCount = packs.filter(
    (pack) => pack.compatibility.status === "compatible",
  ).length;
  if (compatibleCount === packs.length) return "compatible";
  if (compatibleCount > 0) return "partial";
  return "unknown";
}

function packCompatibilityStatus(
  range: string | undefined,
  hostVersion: string | null,
): RemoteYapManifestPackSummary["compatibility"]["status"] {
  if (!range) return "not_declared";
  if (!hostVersion) return "declared";
  return satisfiesVersionRange(hostVersion, range)
    ? "compatible"
    : "incompatible";
}

function endpointPath(
  yapSlug: string,
  endpoint: "assembly" | "runtime-plans" | "remote-manifest",
  mountKeys: string[],
  host?: string,
  hostVersion?: string | null,
): string {
  const params = new URLSearchParams();
  if (host) params.set("host", host);
  if (hostVersion) params.set("hostVersion", hostVersion);
  if (mountKeys.length > 0) params.set("mountKeys", mountKeys.join(","));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `/v1/yaps/${encodeURIComponent(yapSlug)}/${endpoint}${suffix}`;
}

function routeSkills(assembly: ResolvedYapManifest): Record<string, unknown> {
  const value = assembly.merged.routes.skills;
  return isRecord(value) ? value : {};
}

function toolMappings(assembly: ResolvedYapManifest): Record<string, unknown> {
  const value = assembly.merged.toolMap.mappings;
  return isRecord(value) ? value : {};
}

function qualityGateStatus(
  reports: Record<string, unknown>[],
): string | null {
  const status = reports
    .map((report) => report.status)
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return status ?? null;
}

function baseUrlFor(request: FastifyRequest): string {
  const configuredBaseUrl = env.YIGYAPS_API_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, "");

  const host =
    headerFirstValue(request.headers["x-forwarded-host"]) ??
    headerFirstValue(request.headers.host) ??
    "localhost";
  const protocol =
    headerFirstValue(request.headers["x-forwarded-proto"]) ?? "http";
  return `${protocol}://${host}`;
}

function headerFirstValue(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || null;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
