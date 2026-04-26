/**
 * YAP Assembly Resolver
 *
 * Builds a read model from one core Skill Pack plus mounted extension packs.
 *
 * License: Apache 2.0
 */

import type {
  ResolvedYapArtifactRef,
  ResolvedYapConflict,
  ResolvedYapManifest,
  ResolvedYapPack,
  ResolvedYapSkill,
} from "@yigyaps/types";
import type {
  SkillPackArtifactRow,
  SkillPackRow,
  YapPackMountRow,
  YapRow,
} from "@yigyaps/db";

export interface ResolverPackInput {
  role: "core" | "mount";
  mount: YapPackMountRow | null;
  skillPack: SkillPackRow;
  artifacts: SkillPackArtifactRow[];
}

export interface ResolveYapAssemblyInput {
  yap: YapRow;
  corePack: ResolverPackInput;
  mountedPacks: ResolverPackInput[];
}

export function resolveYapAssembly(
  input: ResolveYapAssemblyInput,
): ResolvedYapManifest {
  const packs = [input.corePack, ...input.mountedPacks];
  const resolvedPacks = packs.map(resolvePackArtifacts);
  const conflicts: ResolvedYapConflict[] = [];
  const warnings: string[] = [];
  const skillsByName = new Map<string, ResolvedYapSkill>();
  const routeSkills: Record<string, unknown> = {};
  const toolMappings: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};
  const artifactIndex: ResolvedYapArtifactRef[] = [];

  for (const pack of resolvedPacks) {
    artifactIndex.push(...pack.artifacts.artifactIndex);

    for (const skill of readManifestSkills(pack)) {
      if (skillsByName.has(skill.name)) {
        conflicts.push({
          kind: "skill",
          key: skill.name,
          sourcePackIds: [
            skillsByName.get(skill.name)!.sourcePackId,
            pack.skillPack.id,
          ],
          message: `Skill ${skill.name} is declared by multiple packs`,
        });
      }
      skillsByName.set(skill.name, skill);
    }

    const routes = recordAt(pack.artifacts.routes, "skills");
    for (const [key, value] of Object.entries(routes)) {
      if (Object.prototype.hasOwnProperty.call(routeSkills, key)) {
        conflicts.push({
          kind: "route",
          key,
          sourcePackIds: [findArtifactSource(resolvedPacks, "routes", key), pack.skillPack.id],
          message: `Route graph entry ${key} is declared by multiple packs`,
        });
      }
      routeSkills[key] = value;
    }

    const mappings = recordAt(pack.artifacts.toolMap, "mappings");
    for (const [key, value] of Object.entries(mappings)) {
      if (Object.prototype.hasOwnProperty.call(toolMappings, key)) {
        conflicts.push({
          kind: "tool-map",
          key,
          sourcePackIds: [
            findArtifactSource(resolvedPacks, "tool-map", key),
            pack.skillPack.id,
          ],
          message: `Tool mapping ${key} is declared by multiple packs`,
        });
      }
      toolMappings[key] = value;
    }

    for (const [key, value] of Object.entries(pack.artifacts.schemas)) {
      if (Object.prototype.hasOwnProperty.call(schemas, key)) {
        conflicts.push({
          kind: "schema",
          key,
          sourcePackIds: [findSchemaSource(resolvedPacks, key), pack.skillPack.id],
          message: `Schema ${key} is declared by multiple packs`,
        });
      }
      schemas[key] = value;
    }
  }

  if (conflicts.length > 0) {
    warnings.push(
      "Assembly contains duplicate keys; later packs in packOrder override earlier entries until S08 conflict validation is enforced.",
    );
  }

  return {
    yap: input.yap,
    corePack: resolvedPacks[0],
    mountedPacks: resolvedPacks.slice(1),
    merged: {
      contractVersion:
        input.corePack.skillPack.contractVersion ??
        stringAt(input.corePack.skillPack.manifest, "contract_version") ??
        "1.0",
      packOrder: resolvedPacks.map((pack) => pack.skillPack.id),
      skills: Array.from(skillsByName.values()),
      routes: {
        contract_version: input.corePack.skillPack.contractVersion,
        skills: routeSkills,
      },
      toolMap: {
        contract_version: input.corePack.skillPack.contractVersion,
        mappings: toolMappings,
      },
      schemas,
      artifactIndex,
    },
    diagnostics: {
      conflicts,
      warnings,
    },
    generatedAt: Date.now(),
  };
}

function resolvePackArtifacts(input: ResolverPackInput): ResolvedYapPack {
  return {
    role: input.role,
    mount: input.mount,
    skillPack: input.skillPack,
    artifacts: {
      manifest: input.skillPack.manifest,
      routes: artifactRecord(input.artifacts, "routes"),
      toolMap: artifactRecord(input.artifacts, "tool-map"),
      feedback: artifactRecord(input.artifacts, "feedback"),
      update: artifactRecord(input.artifacts, "update"),
      schemas: schemaRecords(input.artifacts),
      artifactIndex: input.artifacts.map((artifact) =>
        artifactRef(artifact, input.skillPack, input.mount),
      ),
    },
  };
}

function readManifestSkills(pack: ResolvedYapPack): ResolvedYapSkill[] {
  const rawSkills = pack.skillPack.manifest.skills;
  if (!Array.isArray(rawSkills)) return [];

  return rawSkills.flatMap((skill): ResolvedYapSkill[] => {
    if (!isRecord(skill)) return [];
    const name = stringAt(skill, "name");
    if (!name) return [];

    return [
      {
        name,
        version: stringAt(skill, "version"),
        status: stringAt(skill, "status"),
        sourcePackId: pack.skillPack.id,
        sourcePackName: pack.skillPack.name,
        sourceMountKey: pack.mount?.mountKey ?? null,
        definition: skill,
      },
    ];
  });
}

function artifactRecord(
  artifacts: SkillPackArtifactRow[],
  artifactType: SkillPackArtifactRow["artifactType"],
): Record<string, unknown> | null {
  const artifact = artifacts.find((item) => item.artifactType === artifactType);
  return isRecord(artifact?.content) ? artifact.content : null;
}

function schemaRecords(
  artifacts: SkillPackArtifactRow[],
): Record<string, unknown> {
  const schemas: Record<string, unknown> = {};
  for (const artifact of artifacts) {
    if (artifact.artifactType === "schema") {
      schemas[artifact.artifactPath] = artifact.content;
    }
  }
  return schemas;
}

function artifactRef(
  artifact: SkillPackArtifactRow,
  skillPack: SkillPackRow,
  mount: YapPackMountRow | null,
): ResolvedYapArtifactRef {
  return {
    id: artifact.id,
    artifactType: artifact.artifactType,
    artifactPath: artifact.artifactPath,
    mediaType: artifact.mediaType,
    contentSha256: artifact.contentSha256,
    sourcePackId: skillPack.id,
    sourcePackName: skillPack.name,
    sourceMountKey: mount?.mountKey ?? null,
  };
}

function recordAt(
  record: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> {
  const value = record?.[key];
  return isRecord(value) ? value : {};
}

function stringAt(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function findArtifactSource(
  packs: ResolvedYapPack[],
  artifactType: SkillPackArtifactRow["artifactType"],
  key: string,
): string {
  for (const pack of packs) {
    const record =
      artifactType === "routes"
        ? recordAt(pack.artifacts.routes, "skills")
        : recordAt(pack.artifacts.toolMap, "mappings");
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return pack.skillPack.id;
    }
  }
  return "unknown";
}

function findSchemaSource(packs: ResolvedYapPack[], key: string): string {
  for (const pack of packs) {
    if (Object.prototype.hasOwnProperty.call(pack.artifacts.schemas, key)) {
      return pack.skillPack.id;
    }
  }
  return "unknown";
}
