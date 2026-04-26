/**
 * YAP Core Pack Selection
 *
 * Shared by assembly resolution and mount validation.
 *
 * License: Apache 2.0
 */

import type { SkillPackRow, YapRow } from "@yigyaps/db";

export function selectCoreSkillPack(
  yap: YapRow,
  skillPacks: SkillPackRow[],
): SkillPackRow | null {
  const assemblyConfig = isRecord(yap.assemblyConfig) ? yap.assemblyConfig : {};
  const corePackConfig = isRecord(assemblyConfig.corePack)
    ? assemblyConfig.corePack
    : {};
  const configuredName = stringAt(corePackConfig, "name");
  const configuredVersion = stringAt(corePackConfig, "version");

  if (configuredName) {
    const configured = skillPacks.find(
      (pack) =>
        pack.packType === "core" &&
        pack.status !== "archived" &&
        pack.name === configuredName &&
        (!configuredVersion || pack.version === configuredVersion),
    );
    if (configured) return configured;
  }

  return (
    skillPacks.find(
      (pack) => pack.packType === "core" && pack.status === "active",
    ) ??
    skillPacks.find(
      (pack) => pack.packType === "core" && pack.status !== "archived",
    ) ??
    null
  );
}

function stringAt(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
