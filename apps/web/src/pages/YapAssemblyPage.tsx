import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  ResolvedYapArtifactRef,
  ResolvedYapConflict,
  ResolvedYapManifest,
  ResolvedYapPack,
  SkillPackArtifactType,
} from "@yigyaps/types";
import { Header } from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { useYapAssembly } from "../hooks/useYapAssembly";

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
  const { user } = useAuth();
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
    <div className="app-container">
      <Header user={user} />

      <main className="yap-assembly-page">
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
      </main>

      <style>{`
        .yap-assembly-page {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem;
        }

        .yap-workbench-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 2rem;
          align-items: end;
          padding: 0.5rem 0 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .yap-eyebrow {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4b6f8f;
          margin-bottom: 0.4rem;
        }

        .yap-title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1;
          margin-bottom: 0.75rem;
        }

        .yap-description {
          max-width: 760px;
          font-size: 1rem;
          margin: 0;
        }

        .yap-header-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .yap-pill {
          border: 1px solid var(--color-border);
          border-radius: 999px;
          padding: 0.24rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-main);
          background: var(--color-surface);
        }

        .yap-pill.pass {
          color: #13795b;
          border-color: rgba(19, 121, 91, 0.28);
          background: rgba(19, 121, 91, 0.08);
        }

        .yap-pill.blocked {
          color: #b42318;
          border-color: rgba(180, 35, 24, 0.28);
          background: rgba(180, 35, 24, 0.08);
        }

        .yap-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.75rem;
          margin: 1.25rem 0 1.5rem;
        }

        .yap-kpi {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.9rem 1rem;
        }

        .yap-kpi-value {
          display: block;
          font-family: var(--font-serif);
          font-size: 1.55rem;
          font-weight: 700;
          line-height: 1;
          color: var(--color-text-main);
        }

        .yap-kpi-label {
          display: block;
          margin-top: 0.35rem;
          color: var(--color-text-muted);
          font-size: 0.78rem;
          font-weight: 600;
        }

        .yap-workbench-grid {
          display: grid;
          grid-template-columns: minmax(310px, 0.9fr) minmax(0, 1.4fr);
          gap: 1rem;
          align-items: start;
        }

        .yap-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 1rem;
          box-shadow: var(--shadow-soft);
        }

        .yap-panel + .yap-panel {
          margin-top: 1rem;
        }

        .yap-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.85rem;
        }

        .yap-panel-title {
          font-family: var(--font-sans);
          font-size: 0.88rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0;
        }

        .yap-panel-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 700;
        }

        .yap-graph-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .yap-graph-node {
          display: grid;
          grid-template-columns: 3rem minmax(0, 1fr);
          gap: 0.75rem;
          align-items: stretch;
        }

        .yap-graph-rail {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 4.7rem;
        }

        .yap-graph-rail::after {
          content: "";
          position: absolute;
          top: 50%;
          bottom: -1rem;
          width: 1px;
          background: var(--color-border);
        }

        .yap-graph-node:last-child .yap-graph-rail::after {
          display: none;
        }

        .yap-graph-index {
          position: relative;
          z-index: 1;
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #0c2242;
          color: #fff;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .yap-graph-index.mount {
          background: #4b6f8f;
        }

        .yap-pack-row {
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.8rem;
          background: #fffdf8;
          min-width: 0;
        }

        .yap-pack-topline {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .yap-pack-name {
          font-weight: 800;
          color: var(--color-text-main);
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .yap-pack-version {
          color: var(--color-text-muted);
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .yap-pack-meta {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
          margin-top: 0.65rem;
        }

        .yap-mini-badge {
          border-radius: 4px;
          background: var(--color-accent-bg);
          color: var(--color-text-muted);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.16rem 0.45rem;
        }

        .yap-mini-badge.core {
          color: #0c2242;
          background: rgba(12, 34, 66, 0.08);
        }

        .yap-mini-badge.mount {
          color: #4b6f8f;
          background: rgba(75, 111, 143, 0.1);
        }

        .yap-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .yap-table th,
        .yap-table td {
          text-align: left;
          border-bottom: 1px solid var(--color-border);
          padding: 0.68rem 0.5rem;
          vertical-align: top;
          font-size: 0.84rem;
        }

        .yap-table th {
          color: var(--color-text-muted);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
        }

        .yap-table tr:last-child td {
          border-bottom: 0;
        }

        .yap-mono {
          font-family: var(--font-mono);
          font-size: 0.76rem;
          color: var(--color-text-main);
          overflow-wrap: anywhere;
        }

        .yap-empty {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin: 0;
          padding: 1rem 0;
        }

        .yap-conflict-list {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .yap-conflict-item {
          border-left: 3px solid #b42318;
          background: rgba(180, 35, 24, 0.06);
          padding: 0.7rem 0.8rem;
          border-radius: 6px;
        }

        .yap-conflict-kind {
          display: inline-block;
          margin-right: 0.45rem;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #b42318;
        }

        .yap-conflict-message {
          margin: 0.35rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.82rem;
        }

        .yap-capability-list {
          display: grid;
          gap: 0.55rem;
        }

        .yap-capability-item {
          display: grid;
          grid-template-columns: 2.45rem minmax(0, 1fr) auto;
          gap: 0.7rem;
          align-items: center;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.65rem;
          background: #fff;
        }

        .yap-capability-item.pass {
          border-color: rgba(19, 121, 91, 0.28);
          background: rgba(19, 121, 91, 0.06);
        }

        .yap-capability-item.partial {
          border-color: rgba(181, 116, 19, 0.3);
          background: rgba(181, 116, 19, 0.07);
        }

        .yap-capability-code {
          display: grid;
          place-items: center;
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 50%;
          background: #0c2242;
          color: #fff;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .yap-capability-body {
          min-width: 0;
        }

        .yap-capability-label {
          display: block;
          color: var(--color-text-main);
          font-weight: 800;
          line-height: 1.25;
        }

        .yap-capability-detail {
          display: block;
          margin-top: 0.22rem;
          color: var(--color-text-muted);
          font-size: 0.78rem;
          line-height: 1.35;
        }

        .yap-capability-status {
          border: 1px solid var(--color-border);
          border-radius: 999px;
          padding: 0.15rem 0.48rem;
          color: var(--color-text-muted);
          font-size: 0.7rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .yap-capability-status.pass {
          color: #13795b;
          border-color: rgba(19, 121, 91, 0.28);
        }

        .yap-capability-status.partial {
          color: #9a5b00;
          border-color: rgba(181, 116, 19, 0.3);
        }

        .yap-capability-status.missing {
          color: #b42318;
          border-color: rgba(180, 35, 24, 0.26);
        }

        .yap-artifact-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }

        .yap-segmented {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .yap-segment {
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background: var(--color-surface);
          color: var(--color-text-muted);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.32rem 0.58rem;
        }

        .yap-segment[aria-pressed="true"] {
          color: #0c2242;
          border-color: rgba(12, 34, 66, 0.34);
          background: rgba(12, 34, 66, 0.08);
        }

        .yap-loading,
        .yap-error {
          min-height: 48vh;
          display: grid;
          place-items: center;
          color: var(--color-text-muted);
        }

        .yap-error-box {
          width: min(520px, 100%);
          border: 1px solid rgba(180, 35, 24, 0.25);
          border-radius: 8px;
          background: rgba(180, 35, 24, 0.06);
          padding: 1.25rem;
        }

        .yap-error-box h1 {
          font-size: 1.4rem;
          margin-bottom: 0.4rem;
        }

        @media (max-width: 980px) {
          .yap-workbench-header,
          .yap-workbench-grid {
            grid-template-columns: 1fr;
          }

          .yap-header-meta {
            justify-content: flex-start;
          }

          .yap-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .yap-assembly-page {
            padding: 1rem;
          }

          .yap-kpi-grid {
            grid-template-columns: 1fr;
          }

          .yap-table {
            table-layout: auto;
          }

          .yap-capability-item {
            grid-template-columns: 2.45rem minmax(0, 1fr);
          }

          .yap-capability-status {
            grid-column: 2;
            justify-self: start;
          }
        }
      `}</style>
    </div>
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
