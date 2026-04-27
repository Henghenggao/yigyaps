import fs from "fs-extra";
import type {
  RemoteYapManifest,
  SkillPack,
  Yap,
  YapMountValidationResult,
  YapRuntimePlan,
} from "@yigyaps/types";
import {
  prepareYapHostRuntime,
  YigYapsApiError,
  type YapHostRuntimeHandoff,
} from "@yigyaps/client";
import { ensureAuthenticated } from "../lib/auth.js";
import { CliError } from "../lib/errors.js";
import { createPublisherClient, createRegistryClient } from "../lib/registry.js";
import {
  planSkillPackBridgePublish,
  type SkillPackBridgePlan,
  type SkillPackBridgePlanOptions,
} from "../lib/skillpack-bridge-importer.js";
import {
  planYigfinanceImport,
  type YigfinanceImportPlan,
  type YigfinanceImportPlanOptions,
} from "../lib/yigfinance-importer.js";
import { panel, keyValue } from "../lib/ui/components.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";

export interface YapImportOptions extends YigfinanceImportPlanOptions {
  dryRun?: boolean;
  json?: boolean;
}

export interface YapPackPublishOptions extends SkillPackBridgePlanOptions {
  dryRun?: boolean;
  json?: boolean;
}

export interface YapMountOptions {
  mountKey: string;
  mountPoint?: string;
  displayName?: string;
  priority?: number;
  disabled?: boolean;
  required?: boolean;
  json?: boolean;
}

export interface YapMountSwitchOptions extends Omit<YapMountOptions, "mountKey"> {
  mountKey?: string;
}

export interface YapAssemblyExportOptions {
  output?: string;
  maxMounts?: number;
  json?: boolean;
}

export interface YapRuntimePlanOptions {
  task: string;
  requiredSkills?: string[];
  expectedContractVersion?: string;
  maxCandidates?: number;
  maxMounts?: number;
  skillNames?: string[];
  mountKeys?: string[];
  routeKeys?: string[];
  toolKeys?: string[];
  json?: boolean;
}

export interface YapHostPrepareOptions {
  task: string;
  host: string;
  hostVersion?: string;
  mountKeys?: string[];
  requiredSkills?: string[];
  expectedContractVersion?: string;
  maxCandidates?: number;
  maxMounts?: number;
  assembly?: boolean;
  output?: string;
  json?: boolean;
}

interface ImportResult {
  success: boolean;
  yap: Yap;
  yapCreated: boolean;
  skillPack: SkillPack;
  skillPackCreated: boolean;
  artifactCount: number;
}

interface PackPublishResult {
  success: boolean;
  skillPack: SkillPack;
  artifactCount: number;
}

export async function yapImportCommand(
  sourceDir: string,
  options: YapImportOptions,
): Promise<void> {
  if (!options.json) {
    p.intro(colors.primary.bold("Import YAP"));
  }

  try {
    const plan = await planYigfinanceImport(sourceDir, options);

    if (options.dryRun) {
      emitDryRun(plan, Boolean(options.json));
      return;
    }

    const user = await ensureAuthenticated();
    if (!options.json) {
      p.log.step(
        `Importing as ${user.displayName} (${colors.accent(`@${user.githubUsername}`)})`,
      );
    }

    const client = createPublisherClient();
    const s = p.spinner();
    if (!options.json) s.start("Uploading YAP and SkillPack artifacts...");

    const { yap, created: yapCreated } = await createOrReuseYap(client, plan);
    const { skillPack, created: skillPackCreated, artifactCount } =
      await createOrReuseSkillPack(client, yap, plan);

    if (!options.json) {
      s.stop(
        `${skillPackCreated ? "Imported" : "Found"} ${colors.primary(skillPack.name)} v${skillPack.version}`,
      );
    }

    const result: ImportResult = {
      success: true,
      yap,
      yapCreated,
      skillPack,
      skillPackCreated,
      artifactCount,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const summary = keyValue({
      YAP: `${yap.slug} (${yapCreated ? "created" : "existing"})`,
      "Core Pack": `${skillPack.name}@${skillPack.version} (${skillPackCreated ? "created" : "existing"})`,
      Skills: String(plan.summary.skillCount),
      Artifacts: String(artifactCount),
    });
    console.log(panel("YAP Import Result", summary));
    p.outro(colors.success("YAP import ready."));
  } catch (error) {
    if (error instanceof CliError) throw error;
    if (error instanceof YigYapsApiError) {
      throw CliError.network(error.message);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`YAP import failed: ${message}`);
  }
}

export async function yapPackPublishCommand(
  yapIdOrSlug: string,
  sourceDir: string,
  options: YapPackPublishOptions,
): Promise<void> {
  if (!options.json) p.intro(colors.primary.bold("Publish SkillPack"));

  try {
    const plan = await planSkillPackBridgePublish(sourceDir, options);
    if (options.dryRun) {
      emitPackDryRun(plan, Boolean(options.json));
      return;
    }

    await ensureAuthenticated();
    const client = createPublisherClient();
    const result = await client.createSkillPack(yapIdOrSlug, plan.skillPack);
    const output: PackPublishResult = {
      success: true,
      skillPack: result.skillPack,
      artifactCount: result.artifacts.length,
    };

    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(
      panel(
        "SkillPack Published",
        keyValue({
          YAP: yapIdOrSlug,
          Pack: `${result.skillPack.name}@${result.skillPack.version}`,
          Type: result.skillPack.packType,
          Artifacts: String(result.artifacts.length),
        }),
      ),
    );
    p.outro(colors.success("SkillPack publish complete."));
  } catch (error) {
    throw toYapCommandError(error, "SkillPack publish failed");
  }
}

export async function yapMountValidateCommand(
  yapIdOrSlug: string,
  skillPackId: string,
  options: YapMountOptions,
): Promise<void> {
  try {
    await ensureAuthenticated();
    const validation = await createPublisherClient().validateYapPackMount(
      yapIdOrSlug,
      mountParams(skillPackId, options),
    );
    emitValidation(validation, Boolean(options.json));
  } catch (error) {
    throw toYapCommandError(error, "Mount validation failed");
  }
}

export async function yapMountAddCommand(
  yapIdOrSlug: string,
  skillPackId: string,
  options: YapMountOptions,
): Promise<void> {
  try {
    await ensureAuthenticated();
    const result = await createPublisherClient().createYapPackMount(
      yapIdOrSlug,
      mountParams(skillPackId, options),
    );

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return;
    }

    console.log(
      panel(
        "Mount Added",
        keyValue({
          YAP: yapIdOrSlug,
          Mount: result.mount.mountKey,
          Pack: `${result.skillPack.name}@${result.skillPack.version}`,
          Enabled: String(result.mount.enabled),
        }),
      ),
    );
  } catch (error) {
    throw toYapCommandError(error, "Mount add failed");
  }
}

export async function yapMountSwitchCommand(
  yapIdOrSlug: string,
  mountId: string,
  skillPackId: string,
  options: YapMountSwitchOptions,
): Promise<void> {
  try {
    await ensureAuthenticated();
    const client = createPublisherClient();
    const result = await client.updateYapPackMount(yapIdOrSlug, mountId, {
      skillPackId,
      mountKey: options.mountKey,
      mountPoint: options.mountPoint,
      displayName: options.displayName,
      priority: options.priority,
      enabled: options.disabled === undefined ? undefined : !options.disabled,
      required: options.required,
    });

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return;
    }

    console.log(
      panel(
        "Mount Switched",
        keyValue({
          YAP: yapIdOrSlug,
          Mount: result.mount.mountKey,
          Pack: `${result.skillPack.name}@${result.skillPack.version}`,
          Enabled: String(result.mount.enabled),
        }),
      ),
    );
  } catch (error) {
    throw toYapCommandError(error, "Mount switch failed");
  }
}

export async function yapAssemblyExportCommand(
  yapIdOrSlug: string,
  options: YapAssemblyExportOptions,
): Promise<void> {
  try {
    const assembly = await createRegistryClient().getYapAssembly(yapIdOrSlug, {
      maxMounts: options.maxMounts,
    });
    const serialized = JSON.stringify(assembly, null, 2);

    if (options.output) {
      await fs.outputFile(options.output, `${serialized}\n`, "utf8");
    }

    if (options.json || !options.output) {
      console.log(serialized);
      return;
    }

    console.log(
      panel(
        "Assembly Exported",
        keyValue({
          YAP: assembly.yap.slug,
          Output: options.output,
          Packs: String(assembly.merged.packOrder.length),
          Skills: String(assembly.merged.skills.length),
          Conflicts: String(assembly.diagnostics.conflicts.length),
        }),
      ),
    );
  } catch (error) {
    throw toYapCommandError(error, "Assembly export failed");
  }
}

export async function yapRuntimePlanCommand(
  yapIdOrSlug: string,
  options: YapRuntimePlanOptions,
): Promise<void> {
  try {
    const plan = await createRegistryClient().planYapRuntime(
      yapIdOrSlug,
      {
        task: options.task,
        requiredSkills: options.requiredSkills,
        expectedContractVersion: options.expectedContractVersion,
        maxCandidates: options.maxCandidates,
        hints: buildRuntimeHints(options),
      },
      {
        maxMounts: options.maxMounts,
      },
    );

    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    emitRuntimePlan(plan);
  } catch (error) {
    throw toYapCommandError(error, "Runtime plan failed");
  }
}

export async function yapHostPrepareCommand(
  yapIdOrSlug: string,
  options: YapHostPrepareOptions,
): Promise<void> {
  try {
    const handoff = await prepareYapHostRuntime(createRegistryClient(), {
      yap: yapIdOrSlug,
      task: options.task,
      host: options.host,
      hostVersion: options.hostVersion,
      mountKeys: options.mountKeys,
      requiredSkills: options.requiredSkills,
      expectedContractVersion: options.expectedContractVersion,
      maxCandidates: options.maxCandidates,
      maxMounts: options.maxMounts,
      fetchAssembly: options.assembly !== false,
    });

    if (options.output) {
      await fs.outputFile(
        options.output,
        `${JSON.stringify(handoff, null, 2)}\n`,
        "utf8",
      );
    }

    if (options.json) {
      console.log(JSON.stringify(handoff, null, 2));
      return;
    }

    emitHostHandoff(handoff, options.output);
  } catch (error) {
    throw toYapCommandError(error, "Host prepare failed");
  }
}

function emitDryRun(plan: YigfinanceImportPlan, json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          yap: plan.yap,
          skillPack: {
            ...plan.skillPack,
            artifacts: plan.skillPack.artifacts?.map((artifact) => ({
              artifactType: artifact.artifactType,
              artifactPath: artifact.artifactPath,
              mediaType: artifact.mediaType,
            })),
          },
          summary: plan.summary,
        },
        null,
        2,
      ),
    );
    return;
  }

  const summary = keyValue({
    YAP: `${plan.yap.slug} v${plan.yap.version ?? "0.1.0"}`,
    "Core Pack": `${plan.skillPack.name}@${plan.skillPack.version}`,
    Skills: String(plan.summary.skillCount),
    Schemas: String(plan.summary.schemaCount),
    Commands: String(plan.summary.commandCount),
    "Skill MD": String(plan.summary.skillMarkdownCount),
    Artifacts: String(plan.summary.artifactCount),
    Mode: colors.warning("Dry Run"),
  });
  console.log(panel("YAP Import Plan", summary));
  p.outro(colors.success("Dry run successful. No changes made."));
}

function emitPackDryRun(plan: SkillPackBridgePlan, json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          skillPack: {
            ...plan.skillPack,
            artifacts: plan.skillPack.artifacts?.map((artifact) => ({
              artifactType: artifact.artifactType,
              artifactPath: artifact.artifactPath,
              mediaType: artifact.mediaType,
            })),
          },
          summary: plan.summary,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    panel(
      "SkillPack Publish Plan",
      keyValue({
        Pack: `${plan.skillPack.name}@${plan.skillPack.version}`,
        Type: plan.skillPack.packType ?? "extension",
        Schemas: String(plan.summary.schemaCount),
        Commands: String(plan.summary.commandCount),
        "Skill MD": String(plan.summary.skillMarkdownCount),
        Artifacts: String(plan.summary.artifactCount),
        Mode: colors.warning("Dry Run"),
      }),
    ),
  );
}

function emitValidation(
  validation: YapMountValidationResult,
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(validation, null, 2));
    return;
  }

  console.log(
    panel(
      "Mount Validation",
      keyValue({
        Status: validation.status,
        Issues: String(validation.issues.length),
        Packs: String(validation.summary.packOrder.length),
        Skills: String(validation.summary.skillCount),
        Routes: String(validation.summary.routeCount),
        Schemas: String(validation.summary.schemaCount),
      }),
    ),
  );
}

function emitRuntimePlan(plan: YapRuntimePlan): void {
  const topCandidate = plan.candidates[0];
  const candidateLines = plan.candidates
    .slice(0, 5)
    .map((candidate, index) => {
      const mount = candidate.sourceMountKey ?? "core";
      const tools = Object.keys(candidate.toolMappings).length;
      return `${index + 1}. ${candidate.skill.name} (${mount}, score ${candidate.score}, tools ${tools}, schemas ${candidate.schemaKeys.length})`;
    });

  console.log(
    panel(
      "YAP Runtime Plan",
      keyValue({
        YAP: plan.yap.slug,
        Status: plan.status,
        Task: plan.task,
        "Top Skill": topCandidate?.skill.name ?? "none",
        Candidates: String(plan.candidates.length),
        Issues: String(plan.diagnostics.issues.length),
      }),
    ),
  );

  if (candidateLines.length > 0) {
    console.log(candidateLines.join("\n"));
  }
}

function emitHostHandoff(
  handoff: YapHostRuntimeHandoff,
  output?: string,
): void {
  console.log(
    panel(
      "YAP Host Handoff",
      keyValue({
        YAP: `${handoff.yap.slug} v${handoff.yap.version}`,
        Host: hostLabel(handoff.manifest),
        Mode: handoff.mode,
        Status: handoff.plan.status,
        "Selected Skill": handoff.selectedCandidate?.skill.name ?? "none",
        Packs: String(handoff.manifest.assembly.packOrder.length),
        Artifacts: String(handoff.artifactIndex.length),
        "Selected Artifacts": String(handoff.selectedArtifactIndex.length),
        Warnings: String(handoff.warnings.length),
        ...(output ? { Output: output } : {}),
      }),
    ),
  );

  if (handoff.warnings.length > 0) {
    console.log(handoff.warnings.slice(0, 5).join("\n"));
  }
}

function hostLabel(manifest: RemoteYapManifest): string {
  return manifest.host.version
    ? `${manifest.host.target}@${manifest.host.version}`
    : manifest.host.target;
}

function buildRuntimeHints(options: YapRuntimePlanOptions) {
  const hints = {
    skillNames: options.skillNames,
    mountKeys: options.mountKeys,
    routeKeys: options.routeKeys,
    toolKeys: options.toolKeys,
  };
  return Object.values(hints).some((value) => value?.length) ? hints : undefined;
}

function mountParams(skillPackId: string, options: YapMountOptions) {
  return {
    skillPackId,
    mountKey: options.mountKey,
    mountPoint: options.mountPoint,
    displayName: options.displayName,
    priority: options.priority,
    enabled: !options.disabled,
    required: options.required ?? false,
  };
}

function toYapCommandError(error: unknown, fallback: string): CliError {
  if (error instanceof CliError) return error;
  if (error instanceof YigYapsApiError) return CliError.network(error.message);
  const message = error instanceof Error ? error.message : String(error);
  return CliError.system(`${fallback}: ${message}`);
}

async function createOrReuseYap(
  client: ReturnType<typeof createPublisherClient>,
  plan: YigfinanceImportPlan,
): Promise<{ yap: Yap; created: boolean }> {
  try {
    return { yap: await client.createYap(plan.yap), created: true };
  } catch (error) {
    if (!(error instanceof YigYapsApiError) || error.status !== 409) {
      throw error;
    }

    return {
      yap: await client.getYapBySlug(plan.yap.slug),
      created: false,
    };
  }
}

async function createOrReuseSkillPack(
  client: ReturnType<typeof createPublisherClient>,
  yap: Yap,
  plan: YigfinanceImportPlan,
): Promise<{ skillPack: SkillPack; created: boolean; artifactCount: number }> {
  try {
    const result = await client.createSkillPack(yap.id, plan.skillPack);
    return {
      skillPack: result.skillPack,
      created: true,
      artifactCount: result.artifacts.length,
    };
  } catch (error) {
    if (!(error instanceof YigYapsApiError) || error.status !== 409) {
      throw error;
    }

    const result = await client.listSkillPacks(yap.id);
    const existing = result.skillPacks.find(
      (pack) =>
        pack.name === plan.skillPack.name &&
        pack.version === plan.skillPack.version,
    );
    if (!existing) throw error;

    const refreshed = await client.updateSkillPack(yap.id, existing.id, {
      displayName: plan.skillPack.displayName,
      description: plan.skillPack.description,
      packType: plan.skillPack.packType,
      contractVersion: plan.skillPack.contractVersion,
      compatibility: plan.skillPack.compatibility,
      manifest: plan.skillPack.manifest,
      source: plan.skillPack.source,
      status: plan.skillPack.status,
      artifacts: plan.skillPack.artifacts,
    });

    return {
      skillPack: refreshed.skillPack,
      created: false,
      artifactCount: refreshed.artifacts.length,
    };
  }
}
