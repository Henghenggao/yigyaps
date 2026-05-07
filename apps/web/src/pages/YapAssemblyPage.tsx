import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  ResolvedYapArtifactRef,
  ResolvedYapConflict,
  ResolvedYapManifest,
  ResolvedYapPack,
  SkillPackArtifactType,
} from "@yigyaps/types";
import { useYapAssembly } from "../hooks/useYapAssembly";
import { Win98Window } from "../components/Win98Window";

type ArtifactFilter = SkillPackArtifactType | "all";

const ARTIFACT_LABELS: Record<ArtifactFilter, string> = {
  all: "All",
  skillpack: "Manifest",
  "tool-map": "Tool map",
  routes: "Routes",
  feedback: "Feedback",
  update: "Update",
  schema: "Schema",
  command: "Command",
  eval: "Eval",
  fixture: "Fixture",
  "quality-report": "Quality report",
  "skill-md": "Skill MD",
  other: "Other",
};

type CapabilityStatus = "pass" | "partial" | "missing";

type CapabilityLevel = {
  code: string;
  label: string;
  status: CapabilityStatus;
  detail: string;
};

export function YapAssemblyPage() {
  const { yapId = "yigfinance" } = useParams();
  const { assembly, loading, error } = useYapAssembly(yapId);
  const [artifactFilter, setArtifactFilter] = useState<ArtifactFilter>("all");

  const artifactTypes = useMemo<ArtifactFilter[]>(() => {
    if (!assembly) return ["all"];
    const types = new Set(
      assembly.merged.artifactIndex.map((artifact) => artifact.artifactType),
    );
    return ["all", ...Array.from(types).sort()];
  }, [assembly]);

  const filteredArtifacts = useMemo(() => {
    if (!assembly) return [];
    if (artifactFilter === "all") return assembly.merged.artifactIndex;
    return assembly.merged.artifactIndex.filter(
      (artifact) => artifact.artifactType === artifactFilter,
    );
  }, [assembly, artifactFilter]);

  return (
    <Win98Window
      title={`🔧 YAP Assembly — ${yapId}`}
      icon="🔧"
      statusBar="MCP-compatible"
    >
      {loading && <LoadingAssembly />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && assembly && (
        <AssemblyWorkbench
          assembly={assembly}
          artifactTypes={artifactTypes}
          artifactFilter={artifactFilter}
          filteredArtifacts={filteredArtifacts}
          onArtifactFilterChange={setArtifactFilter}
        />
      )}
    </Win98Window>
  );
}

interface AssemblyWorkbenchProps {
  assembly: ResolvedYapManifest;
  artifactTypes: ArtifactFilter[];
  artifactFilter: ArtifactFilter;
  filteredArtifacts: ResolvedYapArtifactRef[];
  onArtifactFilterChange: (filter: ArtifactFilter) => void;
}

function AssemblyWorkbench({
  assembly,
  artifactTypes,
  artifactFilter,
  filteredArtifacts,
  onArtifactFilterChange,
}: AssemblyWorkbenchProps) {
  const packs = [assembly.corePack, ...assembly.mountedPacks];
  const conflictCount = assembly.diagnostics.conflicts.length;
  const routeCount = countRecordKeys(assembly.merged.routes, "skills");
  const toolCount = countRecordKeys(assembly.merged.toolMap, "mappings");
  const schemaCount = Object.keys(assembly.merged.schemas).length;
  const capabilityLevels = buildCapabilityLevels(assembly, {
    conflictCount,
    routeCount,
    toolCount,
    schemaCount,
  });
  const passedCapabilityCount = capabilityLevels.filter(
    (level) => level.status === "pass",
  ).length;

  return (
    <>
      <section className="yap-workbench-header">
        <div>
          <div className="yap-eyebrow">YAP Assembly</div>
          <h1 className="yap-title">{assembly.yap.displayName}</h1>
          <p className="yap-description">{assembly.yap.description}</p>
        </div>
        <div className="yap-header-meta">
          <span className="yap-pill">{assembly.yap.slug}</span>
          <span className="yap-pill">v{assembly.yap.version}</span>
          <span className={conflictCount ? "yap-pill blocked" : "yap-pill pass"}>
            {conflictCount ? `${conflictCount} conflicts` : "No conflicts"}
          </span>
        </div>
      </section>

      <section className="yap-kpi-grid" aria-label="Assembly metrics">
        <Metric value={packs.length} label="Packs" />
        <Metric value={assembly.merged.skills.length} label="Skills" />
        <Metric value={routeCount} label="Routes" />
        <Metric value={toolCount} label="Tools" />
        <Metric value={schemaCount} label="Schemas" />
      </section>

      <section className="yap-workbench-grid">
        <div>
          <section className="yap-panel" aria-labelledby="pack-graph-title">
            <PanelHeader
              title="Pack Graph"
              count={`${packs.length} nodes`}
              id="pack-graph-title"
            />
            <PackGraph packs={packs} />
          </section>

          <section className="yap-panel" aria-labelledby="conflict-title">
            <PanelHeader
              title="Conflict Status"
              count={conflictCount ? `${conflictCount} issues` : "clean"}
              id="conflict-title"
            />
            <ConflictPanel conflicts={assembly.diagnostics.conflicts} />
          </section>

          <section className="yap-panel" aria-labelledby="capability-title">
            <PanelHeader
              title="Capability Level"
              count={`${passedCapabilityCount}/${capabilityLevels.length} ready`}
              id="capability-title"
            />
            <CapabilityPanel levels={capabilityLevels} />
          </section>
        </div>

        <div>
          <section className="yap-panel" aria-labelledby="mounted-packs-title">
            <PanelHeader
              title="Mounted Packs"
              count={`${assembly.mountedPacks.length} active`}
              id="mounted-packs-title"
            />
            <MountedPacksTable packs={assembly.mountedPacks} />
          </section>

          <section className="yap-panel" aria-labelledby="skills-title">
            <PanelHeader
              title="Resolved Skills"
              count={`${assembly.merged.skills.length} skills`}
              id="skills-title"
            />
            <ResolvedSkillsTable assembly={assembly} />
          </section>

          <section className="yap-panel" aria-labelledby="artifacts-title">
            <div className="yap-artifact-toolbar">
              <PanelHeader
                title="Resolved Artifacts"
                count={`${filteredArtifacts.length}/${assembly.merged.artifactIndex.length}`}
                id="artifacts-title"
              />
              <div className="yap-segmented" role="group" aria-label="Artifact type">
                {artifactTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="yap-segment"
                    aria-pressed={artifactFilter === type}
                    onClick={() => onArtifactFilterChange(type)}
                  >
                    {ARTIFACT_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <ResolvedArtifactsTable artifacts={filteredArtifacts} />
          </section>
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="yap-kpi">
      <span className="yap-kpi-value">{value}</span>
      <span className="yap-kpi-label">{label}</span>
    </div>
  );
}

function PanelHeader({
  title,
  count,
  id,
}: {
  title: string;
  count: string;
  id: string;
}) {
  return (
    <div className="yap-panel-header">
      <h2 className="yap-panel-title" id={id}>
        {title}
      </h2>
      <span className="yap-panel-count">{count}</span>
    </div>
  );
}

function PackGraph({ packs }: { packs: ResolvedYapPack[] }) {
  return (
    <ol className="yap-graph-list">
      {packs.map((pack, index) => (
        <li key={pack.skillPack.id} className="yap-graph-node">
          <div className="yap-graph-rail">
            <span
              className={
                pack.role === "core"
                  ? "yap-graph-index"
                  : "yap-graph-index mount"
              }
            >
              {pack.role === "core" ? "C" : index}
            </span>
          </div>
          <PackSummary pack={pack} />
        </li>
      ))}
    </ol>
  );
}

function PackSummary({ pack }: { pack: ResolvedYapPack }) {
  return (
    <div className="yap-pack-row">
      <div className="yap-pack-topline">
        <div className="yap-pack-name">{pack.skillPack.displayName}</div>
        <div className="yap-pack-version">v{pack.skillPack.version}</div>
      </div>
      <div className="yap-pack-meta">
        <span
          className={
            pack.role === "core"
              ? "yap-mini-badge core"
              : "yap-mini-badge mount"
          }
        >
          {pack.role}
        </span>
        <span className="yap-mini-badge">
          contract {pack.skillPack.contractVersion}
        </span>
        {pack.mount && (
          <span className="yap-mini-badge">{pack.mount.mountKey}</span>
        )}
      </div>
    </div>
  );
}

function MountedPacksTable({ packs }: { packs: ResolvedYapPack[] }) {
  if (packs.length === 0) {
    return <p className="yap-empty">No mounted packs.</p>;
  }

  return (
    <table className="yap-table">
      <thead>
        <tr>
          <th style={{ width: "24%" }}>Mount</th>
          <th>Pack</th>
          <th style={{ width: "16%" }}>Priority</th>
          <th style={{ width: "18%" }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {packs.map((pack) => (
          <tr key={pack.skillPack.id}>
            <td>
              <span className="yap-mono">{pack.mount?.mountKey}</span>
            </td>
            <td>
              <strong>{pack.skillPack.displayName}</strong>
              <div className="yap-mono">{pack.skillPack.name}</div>
            </td>
            <td>{pack.mount?.priority ?? 100}</td>
            <td>{pack.mount?.enabled ? "enabled" : "disabled"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConflictPanel({ conflicts }: { conflicts: ResolvedYapConflict[] }) {
  if (conflicts.length === 0) {
    return <p className="yap-empty">Clean assembly.</p>;
  }

  return (
    <div className="yap-conflict-list">
      {conflicts.map((conflict) => (
        <div
          key={`${conflict.kind}:${conflict.key}:${conflict.sourcePackIds.join(",")}`}
          className="yap-conflict-item"
        >
          <span className="yap-conflict-kind">{conflict.kind}</span>
          <span className="yap-mono">{conflict.key}</span>
          <p className="yap-conflict-message">{conflict.message}</p>
        </div>
      ))}
    </div>
  );
}

function CapabilityPanel({ levels }: { levels: CapabilityLevel[] }) {
  return (
    <div className="yap-capability-list">
      {levels.map((level) => (
        <div
          key={level.code}
          className={`yap-capability-item ${level.status}`}
        >
          <span className="yap-capability-code">{level.code}</span>
          <span className="yap-capability-body">
            <span className="yap-capability-label">{level.label}</span>
            <span className="yap-capability-detail">{level.detail}</span>
          </span>
          <span className={`yap-capability-status ${level.status}`}>
            {capabilityStatusLabel(level.status)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResolvedSkillsTable({
  assembly,
}: {
  assembly: ResolvedYapManifest;
}) {
  if (assembly.merged.skills.length === 0) {
    return <p className="yap-empty">No resolved skills.</p>;
  }

  return (
    <table className="yap-table">
      <thead>
        <tr>
          <th>Skill</th>
          <th style={{ width: "28%" }}>Source</th>
          <th style={{ width: "18%" }}>Mount</th>
        </tr>
      </thead>
      <tbody>
        {assembly.merged.skills.map((skill) => (
          <tr key={`${skill.sourcePackId}:${skill.name}`}>
            <td>
              <strong>{skill.name}</strong>
              {skill.version && <div className="yap-mono">v{skill.version}</div>}
            </td>
            <td>{skill.sourcePackName}</td>
            <td>{skill.sourceMountKey ?? "core"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResolvedArtifactsTable({
  artifacts,
}: {
  artifacts: ResolvedYapArtifactRef[];
}) {
  if (artifacts.length === 0) {
    return <p className="yap-empty">No artifacts.</p>;
  }

  return (
    <table className="yap-table">
      <thead>
        <tr>
          <th style={{ width: "18%" }}>Type</th>
          <th>Path</th>
          <th style={{ width: "24%" }}>Source</th>
          <th style={{ width: "18%" }}>Hash</th>
        </tr>
      </thead>
      <tbody>
        {artifacts.map((artifact) => (
          <tr key={artifact.id}>
            <td>{ARTIFACT_LABELS[artifact.artifactType]}</td>
            <td>
              <span className="yap-mono">{artifact.artifactPath}</span>
            </td>
            <td>
              {artifact.sourcePackName}
              <div className="yap-mono">{artifact.sourceMountKey ?? "core"}</div>
            </td>
            <td>
              <span className="yap-mono">
                {artifact.contentSha256.slice(0, 10)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LoadingAssembly() {
  return (
    <div className="yap-loading">
      <div>
        <div className="spinner" />
        <p>Loading assembly...</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="yap-error">
      <div className="yap-error-box">
        <h1>YAP unavailable</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}

function countRecordKeys(
  value: Record<string, unknown>,
  nestedKey: string,
): number {
  const nested = value[nestedKey];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return Object.keys(nested).length;
  }
  return Object.keys(value).length;
}

function buildCapabilityLevels(
  assembly: ResolvedYapManifest,
  metrics: {
    conflictCount: number;
    routeCount: number;
    toolCount: number;
    schemaCount: number;
  },
): CapabilityLevel[] {
  const artifactTypes = new Set(
    assembly.merged.artifactIndex.map((artifact) => artifact.artifactType),
  );
  const skillMdCount = assembly.merged.artifactIndex.filter(
    (artifact) => artifact.artifactType === "skill-md",
  ).length;
  const hasEvalAssets = assembly.merged.artifactIndex.some((artifact) =>
    artifact.artifactType === "eval" ||
    artifact.artifactType === "fixture" ||
    /(^|[/\\])(tests?|evals?|fixtures?)([/\\]|$)|(\.test\.|\.spec\.|eval|fixture)/i.test(
      artifact.artifactPath,
    ),
  );
  const hasGovernanceArtifacts =
    artifactTypes.has("feedback") && artifactTypes.has("update");
  const qualityGate = qualityGateSummary(assembly.merged.qualityReports);
  const contentDepthScore = [
    assembly.merged.skills.length >= 20,
    metrics.schemaCount >= 10,
    skillMdCount >= 10,
  ].filter(Boolean).length;

  return [
    {
      code: "L0",
      label: "Product shell",
      status: assembly.yap.slug ? "pass" : "missing",
      detail: `${assembly.yap.slug} v${assembly.yap.version}`,
    },
    {
      code: "L1",
      label: "Core + extension assembly",
      status:
        assembly.corePack && assembly.mountedPacks.length > 0
          ? "pass"
          : assembly.corePack
            ? "partial"
            : "missing",
      detail: `${assembly.mountedPacks.length} mounted extension pack${assembly.mountedPacks.length === 1 ? "" : "s"}`,
    },
    {
      code: "L2",
      label: "Host manifest ready",
      status:
        metrics.conflictCount === 0 && assembly.merged.artifactIndex.length > 0
          ? "pass"
          : metrics.conflictCount === 0
            ? "partial"
            : "missing",
      detail: `${assembly.merged.artifactIndex.length} artifacts, ${metrics.conflictCount} conflicts`,
    },
    {
      code: "L3",
      label: "Runtime handoff",
      status:
        metrics.routeCount > 0 && metrics.toolCount > 0
          ? "pass"
          : metrics.routeCount > 0 || metrics.toolCount > 0
            ? "partial"
            : "missing",
      detail: `${metrics.routeCount} routes, ${metrics.toolCount} tools`,
    },
    {
      code: "L4",
      label: "Content depth",
      status:
        contentDepthScore >= 2
          ? "pass"
          : assembly.merged.skills.length >= 5
            ? "partial"
            : "missing",
      detail: `${assembly.merged.skills.length} skills, ${metrics.schemaCount} schemas, ${skillMdCount} skill docs`,
    },
    {
      code: "L5",
      label: "Evaluation assets",
      status: hasEvalAssets ? "pass" : "missing",
      detail: hasEvalAssets ? "Tests or eval artifacts present" : "No eval artifacts indexed",
    },
    {
      code: "L6",
      label: "Release governance",
      status: hasGovernanceArtifacts ? "pass" : "missing",
      detail: hasGovernanceArtifacts
        ? "Feedback and update artifacts present"
        : "Feedback/update artifacts missing",
    },
    {
      code: "L7",
      label: "Release quality gate",
      status:
        qualityGate.status === "passed"
          ? "pass"
          : qualityGate.status
            ? "partial"
            : "missing",
      detail: qualityGate.detail,
    },
  ];
}

function qualityGateSummary(
  reports: Record<string, unknown>[],
): { status: string | null; detail: string } {
  const report = reports[0];
  if (!report) {
    return {
      status: null,
      detail: "No quality report indexed",
    };
  }

  const status = typeof report.status === "string" ? report.status : "unknown";
  const evidence =
    report.evidence && typeof report.evidence === "object"
      ? (report.evidence as Record<string, unknown>)
      : {};
  const collectedTestCount =
    typeof evidence.collectedTestCount === "number"
      ? evidence.collectedTestCount
      : null;
  const failedTestCount =
    typeof evidence.cachedFailedTestCount === "number"
      ? evidence.cachedFailedTestCount
      : null;

  if (status === "passed") {
    return {
      status,
      detail:
        collectedTestCount !== null
          ? `${collectedTestCount} tests passed`
          : "Quality report passed",
    };
  }
  if (status === "failed") {
    return {
      status,
      detail:
        failedTestCount !== null
          ? `${failedTestCount} cached test failures need review`
          : "Quality report failed",
    };
  }
  if (status === "needs-run") {
    return {
      status,
      detail: "Quality report indexed; test run still required",
    };
  }
  return {
    status,
    detail: "Quality report indexed with unknown status",
  };
}

function capabilityStatusLabel(status: CapabilityStatus): string {
  if (status === "pass") return "Ready";
  if (status === "partial") return "Seeded";
  return "Missing";
}
