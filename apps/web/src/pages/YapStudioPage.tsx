import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  ResolvedYapManifest,
  SkillPack,
  SkillPackArtifactType,
  SkillPackSource,
  SkillPackType,
  YapImportExecuteResult,
  YapImportPreview,
  Yap,
  YapMountValidationResult,
  YapPackMountWithSkillPack,
  YapSearchResult,
  YapStatus,
  YapVisibility,
} from "@yigyaps/types";
import { Header } from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { API_URL, fetchApi } from "../lib/api";

type CreateYapForm = {
  slug: string;
  version: string;
  displayName: string;
  description: string;
  readme: string;
  category: string;
  tags: string;
  visibility: YapVisibility;
  status: Extract<YapStatus, "draft" | "active">;
};

type CreateMode = "template" | "repo" | "blank";

type MountForm = {
  skillPackId: string;
  mountKey: string;
  mountPoint: string;
  priority: number;
};

type SkillPackDraft = {
  name: string;
  version: string;
  displayName: string;
  description: string;
  packType?: SkillPackType;
  contractVersion?: string;
  compatibility?: Record<string, unknown>;
  manifest: Record<string, unknown>;
  source?: SkillPackSource;
  status?: Extract<SkillPack["status"], "draft" | "active">;
  artifacts?: Array<{
    artifactType: SkillPackArtifactType;
    artifactPath: string;
    mediaType?: string;
    content: unknown;
  }>;
};

const EMPTY_YAP_FORM: CreateYapForm = {
  slug: "",
  version: "0.7.0",
  displayName: "",
  description: "",
  readme: "",
  category: "other",
  tags: "",
  visibility: "public",
  status: "active",
};

const EMPTY_MOUNT_FORM: MountForm = {
  skillPackId: "",
  mountKey: "default-project-pack",
  mountPoint: "extensions/project",
  priority: 10,
};

export function YapStudioPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [yaps, setYaps] = useState<Yap[]>([]);
  const [selectedYapId, setSelectedYapId] = useState<string>("");
  const [skillPacks, setSkillPacks] = useState<SkillPack[]>([]);
  const [mounts, setMounts] = useState<YapPackMountWithSkillPack[]>([]);
  const [assembly, setAssembly] = useState<ResolvedYapManifest | null>(null);
  const [validation, setValidation] = useState<YapMountValidationResult | null>(
    null,
  );
  const [switchTargets, setSwitchTargets] = useState<Record<string, string>>(
    {},
  );
  const [yapForm, setYapForm] = useState<CreateYapForm>(EMPTY_YAP_FORM);
  const [createMode, setCreateMode] = useState<CreateMode>("template");
  const [repoImportPath, setRepoImportPath] = useState("Yigfinance");
  const [repoPreview, setRepoPreview] = useState<YapImportPreview | null>(null);
  const [mountForm, setMountForm] = useState<MountForm>(EMPTY_MOUNT_FORM);
  const [packJson, setPackJson] = useState(() =>
    samplePackJson("yigfinance", "extension"),
  );
  const [loadingYaps, setLoadingYaps] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [submittingYap, setSubmittingYap] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [executingImport, setExecutingImport] = useState(false);
  const [submittingPack, setSubmittingPack] = useState(false);
  const [submittingMount, setSubmittingMount] = useState(false);
  const [switchingMountId, setSwitchingMountId] = useState<string | null>(null);

  const selectedYap = useMemo(
    () => yaps.find((yap) => yap.id === selectedYapId) ?? null,
    [selectedYapId, yaps],
  );

  const extensionPacks = useMemo(
    () => skillPacks.filter((pack) => pack.packType === "extension"),
    [skillPacks],
  );

  const loadYaps = useCallback(async () => {
    setLoadingYaps(true);
    try {
      const result = await fetchApi<YapSearchResult>(
        "/v1/yaps?mine=true&limit=50",
      );
      setYaps(result.yaps);
      setSelectedYapId((current) => current || result.yaps[0]?.id || "");
    } catch (error) {
      addToast({
        message: error instanceof Error ? error.message : "Failed to load YAPs",
        type: "error",
      });
    } finally {
      setLoadingYaps(false);
    }
  }, [addToast]);

  const loadWorkspace = useCallback(async (yap: Yap) => {
    setLoadingWorkspace(true);
    setValidation(null);
    try {
      const [packsResult, mountsResult, assemblyResult] = await Promise.all([
        fetchApi<{ skillPacks: SkillPack[]; total: number }>(
          `/v1/yaps/${encodeURIComponent(yap.slug)}/skill-packs`,
        ),
        fetchApi<{
          mounts: YapPackMountWithSkillPack[];
          total: number;
          limit: number;
          offset: number;
        }>(`/v1/yaps/${encodeURIComponent(yap.slug)}/mounts?limit=100`),
        fetchApi<ResolvedYapManifest>(
          `/v1/yaps/${encodeURIComponent(yap.slug)}/assembly`,
        ).catch(() => null),
      ]);
      setSkillPacks(packsResult.skillPacks);
      setMounts(mountsResult.mounts);
      setAssembly(assemblyResult);
      setSwitchTargets(
        Object.fromEntries(
          mountsResult.mounts.map(({ mount }) => [mount.id, mount.skillPackId]),
        ),
      );
      setMountForm((current) => ({
        ...current,
        skillPackId:
          current.skillPackId ||
          packsResult.skillPacks.find((pack) => pack.packType === "extension")
            ?.id ||
          "",
      }));
    } catch (error) {
      addToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load YAP workspace",
        type: "error",
      });
    } finally {
      setLoadingWorkspace(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadYaps();
  }, [loadYaps]);

  useEffect(() => {
    if (!selectedYap) {
      setSkillPacks([]);
      setMounts([]);
      setAssembly(null);
      return;
    }
    setPackJson(samplePackJson(selectedYap.slug, "extension"));
    void loadWorkspace(selectedYap);
  }, [loadWorkspace, selectedYap]);

  function applyYigScriptTemplate() {
    setYapForm(yigscriptYapPreset());
    setPackJson(videoScriptStructurerPackJson("yigscript"));
    setMountForm((current) => ({
      ...current,
      mountKey: "video-script-structurer",
      mountPoint: "extensions/video-script-structurer",
      priority: 20,
    }));
  }

  function applyYigfinanceTemplate() {
    setYapForm(yigfinanceYapPreset());
    setPackJson(samplePackJson("yigfinance", "core"));
    setMountForm((current) => ({
      ...current,
      mountKey: "default-project-pack",
      mountPoint: "extensions/project",
      priority: 10,
    }));
  }

  function stageRepoImportShell() {
    setCreateMode("repo");
    applyYigfinanceTemplate();
  }

  function startBlankYap() {
    setYapForm(EMPTY_YAP_FORM);
    setPackJson(samplePackJson("yigfinance", "extension"));
    setMountForm(EMPTY_MOUNT_FORM);
    setRepoPreview(null);
  }

  async function previewRepoImport() {
    setPreviewingImport(true);
    try {
      const preview = await fetchApi<YapImportPreview>(
        "/v1/yap-imports/preview",
        {
          method: "POST",
          body: JSON.stringify({
            format: "yigfinance",
            sourceDir: repoImportPath,
            includeDefaultExtensions: true,
          }),
        },
      );
      setRepoPreview(preview);
      setYapForm({
        slug: preview.yap.slug,
        version: preview.yap.version,
        displayName: preview.yap.displayName,
        description: preview.yap.description,
        readme: "",
        category: preview.yap.category,
        tags: preview.yap.tags.join(", "),
        visibility: preview.yap.visibility,
        status: preview.yap.status,
      });
      setMountForm((current) => ({
        ...current,
        mountKey: preview.defaultMounts[0]?.mountKey ?? current.mountKey,
        mountPoint: preview.defaultMounts[0]?.mountPoint ?? current.mountPoint,
        priority: preview.defaultMounts[0]?.priority ?? current.priority,
      }));
      addToast({ message: "Import preview ready", type: "success" });
    } catch (error) {
      addToast({
        message:
          error instanceof Error ? error.message : "Failed to preview import",
        type: "error",
      });
    } finally {
      setPreviewingImport(false);
    }
  }

  async function executeRepoImport() {
    setExecutingImport(true);
    try {
      const result = await fetchApi<YapImportExecuteResult>(
        "/v1/yap-imports/execute",
        {
          method: "POST",
          body: JSON.stringify({
            format: "yigfinance",
            sourceDir: repoImportPath,
            includeDefaultExtensions: true,
          }),
        },
      );
      addToast({
        message:
          result.yapAction === "created"
            ? "YAP imported"
            : "YAP import refreshed",
        type: "success",
      });
      await loadYaps();
      navigate(`/yaps/${result.yap.slug}/assembly`);
    } catch (error) {
      addToast({
        message:
          error instanceof Error ? error.message : "Failed to execute import",
        type: "error",
      });
    } finally {
      setExecutingImport(false);
    }
  }

  async function createYap(event: FormEvent) {
    event.preventDefault();
    setSubmittingYap(true);
    try {
      const yap = await fetchApi<Yap>("/v1/yaps", {
        method: "POST",
          body: JSON.stringify({
            ...yapForm,
            category: yapForm.category.trim() || "other",
            tags: parseTags(yapForm.tags),
            readme: yapForm.readme.trim() || undefined,
            assemblyConfig: {
              corePack: { name: yapForm.slug, version: yapForm.version },
              mountedPacks: [],
            },
        }),
      });
      setYaps((current) => [yap, ...current]);
      setSelectedYapId(yap.id);
      setYapForm(EMPTY_YAP_FORM);
      addToast({ message: "YAP created", type: "success" });
    } catch (error) {
      addToast({
        message:
          error instanceof Error ? error.message : "Failed to create YAP",
        type: "error",
      });
    } finally {
      setSubmittingYap(false);
    }
  }

  async function publishSkillPack(event: FormEvent) {
    event.preventDefault();
    if (!selectedYap) return;
    setSubmittingPack(true);
    try {
      const draft = parseSkillPackDraft(packJson);
      await fetchApi(
        `/v1/yaps/${encodeURIComponent(selectedYap.slug)}/skill-packs`,
        {
          method: "POST",
          body: JSON.stringify({
            packType: "extension",
            contractVersion: "1.0",
            source: "manual",
            status: "active",
            artifacts: [],
            ...draft,
          }),
        },
      );
      addToast({ message: "SkillPack published", type: "success" });
      await loadWorkspace(selectedYap);
    } catch (error) {
      addToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to publish SkillPack",
        type: "error",
      });
    } finally {
      setSubmittingPack(false);
    }
  }

  async function validateMountCandidate() {
    if (!selectedYap) return null;
    const candidate = {
      ...mountForm,
      priority: Number(mountForm.priority),
      enabled: true,
    };
    const result = await fetchApi<YapMountValidationResult>(
      `/v1/yaps/${encodeURIComponent(selectedYap.slug)}/mount-validations`,
      {
        method: "POST",
        body: JSON.stringify(candidate),
      },
    );
    setValidation(result);
    return result;
  }

  async function createMount(event: FormEvent) {
    event.preventDefault();
    if (!selectedYap) return;
    setSubmittingMount(true);
    try {
      const result = await validateMountCandidate();
      if (result?.status === "blocked") {
        addToast({
          message: "Mount validation blocked activation",
          type: "warning",
        });
        return;
      }
      await fetchApi(
        `/v1/yaps/${encodeURIComponent(selectedYap.slug)}/mounts`,
        {
          method: "POST",
          body: JSON.stringify({
            ...mountForm,
            priority: Number(mountForm.priority),
            enabled: true,
          }),
        },
      );
      addToast({ message: "Extension mounted", type: "success" });
      await loadWorkspace(selectedYap);
    } catch (error) {
      addToast({
        message:
          error instanceof Error ? error.message : "Failed to mount pack",
        type: "error",
      });
    } finally {
      setSubmittingMount(false);
    }
  }

  async function switchMount(mountId: string) {
    if (!selectedYap) return;
    const skillPackId = switchTargets[mountId];
    if (!skillPackId) return;
    setSwitchingMountId(mountId);
    try {
      await fetchApi(
        `/v1/yaps/${encodeURIComponent(selectedYap.slug)}/mounts/${encodeURIComponent(mountId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ skillPackId }),
        },
      );
      addToast({ message: "Mount switched", type: "success" });
      await loadWorkspace(selectedYap);
    } catch (error) {
      addToast({
        message:
          error instanceof Error ? error.message : "Failed to switch mount",
        type: "error",
      });
    } finally {
      setSwitchingMountId(null);
    }
  }

  const remoteManifestUrl = selectedYap
    ? `${API_URL}/v1/yaps/${encodeURIComponent(selectedYap.slug)}/remote-manifest?host=yigthinker&hostVersion=0.4.0`
    : "";

  return (
    <div className="app-container">
      <Header user={user} />

      <main className="studio-shell">
        <section className="studio-hero">
          <div>
            <div className="studio-eyebrow">YAP Studio</div>
            <h1>Build product-grade YAP assemblies.</h1>
          </div>
          <div className="studio-actions">
            {selectedYap && (
              <>
                <Link
                  className="studio-button secondary"
                  to={`/yaps/${selectedYap.slug}/assembly`}
                >
                  Preview assembly
                </Link>
                <a className="studio-button" href={remoteManifestUrl}>
                  Remote manifest
                </a>
              </>
            )}
          </div>
        </section>

        <section className="studio-layout">
          <aside className="studio-sidebar">
            <Panel title="YAPs" count={String(yaps.length)}>
              <form className="studio-form compact" onSubmit={createYap}>
                <div
                  className="studio-mode-tabs"
                  role="tablist"
                  aria-label="Creation mode"
                >
                  <button
                    type="button"
                    role="tab"
                    className="studio-mode-tab"
                    aria-selected={createMode === "template"}
                    onClick={() => setCreateMode("template")}
                  >
                    Template
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className="studio-mode-tab"
                    aria-selected={createMode === "repo"}
                    onClick={() => setCreateMode("repo")}
                  >
                    Repo import
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className="studio-mode-tab"
                    aria-selected={createMode === "blank"}
                    onClick={() => {
                      setCreateMode("blank");
                      startBlankYap();
                    }}
                  >
                    Blank
                  </button>
                </div>

                {createMode === "template" && (
                  <div className="studio-create-panel">
                    <button
                      type="button"
                      className="studio-template-option"
                      aria-label="Apply YigScript template"
                      onClick={applyYigScriptTemplate}
                    >
                      <span>
                        <strong>YigScript</strong>
                        <small>Video Script Structurer as extension</small>
                      </span>
                      <em>Architecture-ready</em>
                    </button>
                    <button
                      type="button"
                      className="studio-template-option"
                      aria-label="Apply Yigfinance template"
                      onClick={applyYigfinanceTemplate}
                    >
                      <span>
                        <strong>Yigfinance</strong>
                        <small>Core shell plus project packs</small>
                      </span>
                      <em>Reference-ready</em>
                    </button>
                  </div>
                )}

                {createMode === "repo" && (
                  <div className="studio-create-panel">
                    <label>
                      Repository path
                      <input
                        value={repoImportPath}
                        onChange={(event) =>
                          setRepoImportPath(event.target.value)
                        }
                        placeholder="Yigfinance"
                      />
                    </label>
                    <div className="studio-create-signals">
                      <span>
                        <strong>Layout</strong>
                        <small>Core + extensions</small>
                      </span>
                      <span>
                        <strong>Import depth</strong>
                        <small>Content + evals</small>
                      </span>
                    </div>
                    {repoPreview && <ImportPreviewPanel preview={repoPreview} />}
                    {repoPreview?.warnings.length ? (
                      <div className="studio-import-warnings">
                        {repoPreview.warnings.map((warning) => (
                          <span key={warning}>{warning}</span>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="studio-button full"
                      onClick={previewRepoImport}
                      disabled={previewingImport}
                    >
                      {previewingImport ? "Previewing..." : "Preview import"}
                    </button>
                    <button
                      type="button"
                      className="studio-button full"
                      onClick={executeRepoImport}
                      disabled={!repoPreview || executingImport}
                    >
                      {executingImport ? "Importing..." : "Execute import"}
                    </button>
                    <button
                      type="button"
                      className="studio-button secondary full"
                      onClick={stageRepoImportShell}
                    >
                      Stage import shell
                    </button>
                  </div>
                )}

                {createMode === "blank" && (
                  <div className="studio-create-panel subtle">
                    <div className="studio-create-signals">
                      <span>
                        <strong>Architecture</strong>
                        <small>Manual</small>
                      </span>
                      <span>
                        <strong>Default packs</strong>
                        <small>None</small>
                      </span>
                    </div>
                  </div>
                )}

                <label>
                  Slug
                  <input
                    value={yapForm.slug}
                    onChange={(event) =>
                      setYapForm((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                    placeholder="yigfinance"
                    required
                  />
                </label>
                <label>
                  Display name
                  <input
                    value={yapForm.displayName}
                    onChange={(event) =>
                      setYapForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Yigfinance"
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={yapForm.description}
                    onChange={(event) =>
                      setYapForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    required
                  />
                </label>
                <div className="studio-row">
                  <label>
                    Version
                    <input
                      value={yapForm.version}
                      onChange={(event) =>
                        setYapForm((current) => ({
                          ...current,
                          version: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={yapForm.category}
                      onChange={(event) =>
                        setYapForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      placeholder="script"
                    />
                  </label>
                </div>
                <div className="studio-row">
                  <label>
                    Visibility
                    <select
                      value={yapForm.visibility}
                      onChange={(event) =>
                        setYapForm((current) => ({
                          ...current,
                          visibility: event.target.value as YapVisibility,
                        }))
                      }
                    >
                      <option value="public">public</option>
                      <option value="unlisted">unlisted</option>
                      <option value="private">private</option>
                    </select>
                  </label>
                  <label>
                    Status
                    <select
                      value={yapForm.status}
                      onChange={(event) =>
                        setYapForm((current) => ({
                          ...current,
                          status: event.target.value as Extract<
                            YapStatus,
                            "draft" | "active"
                          >,
                        }))
                      }
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                    </select>
                  </label>
                </div>
                <label>
                  Tags
                  <input
                    value={yapForm.tags}
                    onChange={(event) =>
                      setYapForm((current) => ({
                        ...current,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="script, video, creator-tools"
                  />
                </label>
                <label>
                  Readme
                  <textarea
                    value={yapForm.readme}
                    onChange={(event) =>
                      setYapForm((current) => ({
                        ...current,
                        readme: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Product positioning, default packs, and host integration notes."
                  />
                </label>
                <button className="studio-button full" disabled={submittingYap}>
                  {submittingYap ? "Creating..." : "Create YAP"}
                </button>
              </form>

              <div className="studio-list">
                {loadingYaps && <p className="studio-empty">Loading YAPs...</p>}
                {!loadingYaps && yaps.length === 0 && (
                  <p className="studio-empty">No YAPs yet.</p>
                )}
                {yaps.map((yap) => (
                  <button
                    key={yap.id}
                    className={
                      yap.id === selectedYapId
                        ? "studio-list-item active"
                        : "studio-list-item"
                    }
                    onClick={() => setSelectedYapId(yap.id)}
                  >
                    <span>{yap.displayName}</span>
                    <small>{yap.slug}</small>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>

          <section className="studio-main">
            {!selectedYap ? (
              <div className="studio-empty-state">
                <h2>Select or create a YAP.</h2>
              </div>
            ) : (
              <>
                <section className="studio-summary">
                  <Metric label="SkillPacks" value={skillPacks.length} />
                  <Metric label="Active mounts" value={mounts.length} />
                  <Metric
                    label="Skills"
                    value={assembly?.merged.skills.length ?? 0}
                  />
                  <Metric
                    label="Conflicts"
                    value={assembly?.diagnostics.conflicts.length ?? 0}
                  />
                </section>

                <section className="studio-grid">
                  <Panel
                    title="SkillPacks"
                    count={
                      loadingWorkspace ? "loading" : String(skillPacks.length)
                    }
                  >
                    <form className="studio-form" onSubmit={publishSkillPack}>
                      <div className="studio-toolbar">
                        <button
                          type="button"
                          className="studio-chip"
                          onClick={() =>
                            setPackJson(
                              samplePackJson(selectedYap.slug, "core"),
                            )
                          }
                        >
                          Core preset
                        </button>
                        <button
                          type="button"
                          className="studio-chip"
                          onClick={() =>
                            setPackJson(
                              samplePackJson(selectedYap.slug, "extension"),
                            )
                          }
                        >
                          Extension preset
                        </button>
                        <button
                          type="button"
                          className="studio-chip"
                          onClick={() =>
                            setPackJson(yigscriptCorePackJson(selectedYap.slug))
                          }
                        >
                          YigScript core
                        </button>
                        <button
                          type="button"
                          className="studio-chip"
                          onClick={() =>
                            setPackJson(
                              videoScriptStructurerPackJson(selectedYap.slug),
                            )
                          }
                        >
                          Video script extension
                        </button>
                      </div>
                      <textarea
                        className="studio-json"
                        value={packJson}
                        onChange={(event) => setPackJson(event.target.value)}
                        spellCheck={false}
                        rows={18}
                      />
                      <button
                        className="studio-button full"
                        disabled={submittingPack}
                      >
                        {submittingPack ? "Publishing..." : "Publish SkillPack"}
                      </button>
                    </form>
                    <SkillPackTable packs={skillPacks} />
                  </Panel>

                  <Panel title="Mounts" count={String(mounts.length)}>
                    <form
                      className="studio-form compact"
                      onSubmit={createMount}
                    >
                      <label>
                        Extension pack
                        <select
                          value={mountForm.skillPackId}
                          onChange={(event) =>
                            setMountForm((current) => ({
                              ...current,
                              skillPackId: event.target.value,
                            }))
                          }
                          required
                        >
                          <option value="">Select pack</option>
                          {extensionPacks.map((pack) => (
                            <option key={pack.id} value={pack.id}>
                              {pack.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="studio-row">
                        <label>
                          Mount key
                          <input
                            value={mountForm.mountKey}
                            onChange={(event) =>
                              setMountForm((current) => ({
                                ...current,
                                mountKey: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                        <label>
                          Priority
                          <input
                            type="number"
                            value={mountForm.priority}
                            onChange={(event) =>
                              setMountForm((current) => ({
                                ...current,
                                priority: Number(event.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label>
                        Mount point
                        <input
                          value={mountForm.mountPoint}
                          onChange={(event) =>
                            setMountForm((current) => ({
                              ...current,
                              mountPoint: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        className="studio-button full"
                        disabled={
                          submittingMount || extensionPacks.length === 0
                        }
                      >
                        {submittingMount ? "Mounting..." : "Validate and mount"}
                      </button>
                    </form>

                    {validation && <ValidationPanel validation={validation} />}

                    <MountTable
                      mounts={mounts}
                      extensionPacks={extensionPacks}
                      switchTargets={switchTargets}
                      switchingMountId={switchingMountId}
                      onSwitchTargetChange={(mountId, skillPackId) =>
                        setSwitchTargets((current) => ({
                          ...current,
                          [mountId]: skillPackId,
                        }))
                      }
                      onSwitch={switchMount}
                    />
                  </Panel>
                </section>
              </>
            )}
          </section>
        </section>
      </main>

      <style>{`
        .studio-shell {
          max-width: 1440px;
          margin: 0 auto;
          padding: 2rem;
        }

        .studio-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.5rem;
          padding: 1rem 0 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .studio-eyebrow {
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #3f6b8e;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 0.45rem;
        }

        .studio-hero h1 {
          margin: 0;
          max-width: 740px;
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 1;
        }

        .studio-actions,
        .studio-toolbar {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .studio-layout {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
          margin-top: 1rem;
        }

        .studio-sidebar,
        .studio-main {
          min-width: 0;
        }

        .studio-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 1rem;
          box-shadow: var(--shadow-soft);
        }

        .studio-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.9rem;
        }

        .studio-panel-title {
          margin: 0;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
        }

        .studio-panel-count {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .studio-form {
          display: grid;
          gap: 0.75rem;
        }

        .studio-form.compact {
          gap: 0.65rem;
        }

        .studio-form label {
          display: grid;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-sub);
        }

        .studio-form input,
        .studio-form select,
        .studio-form textarea {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          color: var(--color-text-main);
          padding: 0.65rem 0.75rem;
          font: inherit;
          text-transform: none;
          letter-spacing: 0;
        }

        .studio-form textarea {
          resize: vertical;
        }

        .studio-json {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          line-height: 1.55;
          min-height: 28rem;
        }

        .studio-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
        }

        .studio-mode-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.35rem;
          padding: 0.25rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
        }

        .studio-mode-tab {
          min-height: 2.2rem;
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
          color: var(--color-text-muted);
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
        }

        .studio-mode-tab[aria-selected="true"] {
          border-color: rgba(13, 49, 88, 0.25);
          background: #fff;
          color: #0d3158;
          box-shadow: var(--shadow-soft);
        }

        .studio-create-panel {
          display: grid;
          gap: 0.55rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: #fff;
          padding: 0.65rem;
        }

        .studio-create-panel.subtle {
          background: transparent;
        }

        .studio-template-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          min-height: 4rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-surface);
          color: var(--color-text-main);
          padding: 0.75rem;
          text-align: left;
          cursor: pointer;
        }

        .studio-template-option:hover,
        .studio-template-option:focus-visible {
          border-color: rgba(13, 49, 88, 0.35);
          background: rgba(13, 49, 88, 0.04);
        }

        .studio-template-option strong,
        .studio-template-option small,
        .studio-template-option em {
          display: block;
        }

        .studio-template-option strong {
          font-size: 0.9rem;
        }

        .studio-template-option small {
          margin-top: 0.2rem;
          color: var(--color-text-muted);
          font-size: 0.76rem;
          font-weight: 600;
        }

        .studio-template-option em {
          color: #13795b;
          font-size: 0.72rem;
          font-style: normal;
          font-weight: 800;
          white-space: nowrap;
        }

        .studio-create-signals {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
        }

        .studio-create-signals span {
          min-width: 0;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-surface);
          padding: 0.55rem;
        }

        .studio-create-signals strong,
        .studio-create-signals small {
          display: block;
        }

        .studio-create-signals strong {
          color: var(--color-text-main);
          font-size: 0.74rem;
        }

        .studio-create-signals small {
          margin-top: 0.2rem;
          color: var(--color-text-muted);
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0;
        }

        .studio-import-preview {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.45rem;
        }

        .studio-import-preview div {
          min-width: 0;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: rgba(19, 121, 91, 0.06);
          padding: 0.55rem;
        }

        .studio-import-preview strong,
        .studio-import-preview span {
          display: block;
        }

        .studio-import-preview strong {
          color: #13795b;
          font-family: var(--font-serif);
          font-size: 1.2rem;
          line-height: 1;
        }

        .studio-import-preview span {
          margin-top: 0.22rem;
          color: var(--color-text-muted);
          font-size: 0.7rem;
          font-weight: 800;
        }

        .studio-import-warnings {
          display: grid;
          gap: 0.35rem;
        }

        .studio-import-warnings span {
          border-left: 3px solid #9a5b00;
          border-radius: 6px;
          background: rgba(181, 116, 19, 0.07);
          color: #754400;
          padding: 0.5rem 0.65rem;
          font-size: 0.76rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .studio-button,
        .studio-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #0d3158;
          border-radius: 8px;
          min-height: 2.5rem;
          padding: 0 0.9rem;
          background: #0d3158;
          color: #fff;
          font-weight: 800;
          font-size: 0.82rem;
          text-decoration: none;
          cursor: pointer;
        }

        .studio-button.secondary,
        .studio-chip {
          background: transparent;
          color: var(--color-text-main);
          border-color: var(--color-border);
        }

        .studio-button.full {
          width: 100%;
        }

        .studio-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .studio-list {
          margin-top: 1rem;
          display: grid;
          gap: 0.45rem;
        }

        .studio-list-item {
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: transparent;
          padding: 0.75rem;
          text-align: left;
          color: var(--color-text-main);
          cursor: pointer;
        }

        .studio-list-item.active {
          border-color: #0d3158;
          background: rgba(13, 49, 88, 0.08);
        }

        .studio-list-item span,
        .studio-list-item small {
          display: block;
        }

        .studio-list-item span {
          font-weight: 800;
        }

        .studio-list-item small {
          margin-top: 0.2rem;
          font-family: var(--font-mono);
          color: var(--color-text-muted);
        }

        .studio-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .studio-metric {
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-surface);
          padding: 0.9rem 1rem;
        }

        .studio-metric strong {
          display: block;
          font-family: var(--font-serif);
          font-size: 1.65rem;
          line-height: 1;
        }

        .studio-metric span {
          display: block;
          margin-top: 0.3rem;
          color: var(--color-text-muted);
          font-size: 0.78rem;
          font-weight: 700;
        }

        .studio-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 1rem;
          align-items: start;
        }

        .studio-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          font-size: 0.84rem;
        }

        .studio-table th,
        .studio-table td {
          text-align: left;
          padding: 0.65rem 0.45rem;
          border-bottom: 1px solid var(--color-border);
          vertical-align: middle;
        }

        .studio-table th {
          color: var(--color-text-muted);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .studio-mono {
          font-family: var(--font-mono);
          font-size: 0.78rem;
        }

        .studio-badge {
          display: inline-flex;
          border: 1px solid var(--color-border);
          border-radius: 999px;
          padding: 0.15rem 0.5rem;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .studio-badge.blocked {
          color: #b42318;
          border-color: rgba(180, 35, 24, 0.3);
          background: rgba(180, 35, 24, 0.08);
        }

        .studio-badge.pass {
          color: #13795b;
          border-color: rgba(19, 121, 91, 0.3);
          background: rgba(19, 121, 91, 0.08);
        }

        .studio-validation {
          margin-top: 1rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.8rem;
        }

        .studio-validation ul {
          margin: 0.65rem 0 0;
          padding-left: 1.2rem;
        }

        .studio-empty,
        .studio-empty-state {
          color: var(--color-text-muted);
        }

        .studio-empty-state {
          border: 1px dashed var(--color-border);
          border-radius: 8px;
          padding: 3rem;
          text-align: center;
        }

        @media (max-width: 1120px) {
          .studio-layout,
          .studio-grid {
            grid-template-columns: 1fr;
          }

          .studio-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .studio-shell {
            padding: 1rem;
          }

          .studio-hero {
            align-items: stretch;
            flex-direction: column;
          }

          .studio-row,
          .studio-summary,
          .studio-create-signals,
          .studio-import-preview {
            grid-template-columns: 1fr;
          }

          .studio-table {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section className="studio-panel">
      <div className="studio-panel-header">
        <h2 className="studio-panel-title">{title}</h2>
        {count && <span className="studio-panel-count">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="studio-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ImportPreviewPanel({ preview }: { preview: YapImportPreview }) {
  return (
    <div className="studio-import-preview" aria-label="Import preview">
      <div>
        <strong>{preview.summary.skillCount}</strong>
        <span>Skills</span>
      </div>
      <div>
        <strong>{preview.summary.schemaCount}</strong>
        <span>Schemas</span>
      </div>
      <div>
        <strong>{preview.summary.commandCount}</strong>
        <span>Commands</span>
      </div>
      <div>
        <strong>{preview.summary.evalArtifactCount}</strong>
        <span>Eval assets</span>
      </div>
      <div>
        <strong>{preview.summary.qualityReportStatus ?? "none"}</strong>
        <span>Quality gate</span>
      </div>
      <div>
        <strong>{preview.summary.extensionPackCount}</strong>
        <span>Extensions</span>
      </div>
      <div>
        <strong>{preview.summary.defaultMountCount}</strong>
        <span>Mounts</span>
      </div>
      <div>
        <strong>{preview.summary.artifactCount}</strong>
        <span>Artifacts</span>
      </div>
    </div>
  );
}

function SkillPackTable({ packs }: { packs: SkillPack[] }) {
  if (packs.length === 0) {
    return <p className="studio-empty">No SkillPacks.</p>;
  }

  return (
    <table className="studio-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {packs.map((pack) => (
          <tr key={pack.id}>
            <td>
              <strong>{pack.displayName}</strong>
              <div className="studio-mono">{pack.name}</div>
            </td>
            <td>{pack.packType}</td>
            <td>
              <span className="studio-badge">{pack.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MountTable({
  mounts,
  extensionPacks,
  switchTargets,
  switchingMountId,
  onSwitchTargetChange,
  onSwitch,
}: {
  mounts: YapPackMountWithSkillPack[];
  extensionPacks: SkillPack[];
  switchTargets: Record<string, string>;
  switchingMountId: string | null;
  onSwitchTargetChange: (mountId: string, skillPackId: string) => void;
  onSwitch: (mountId: string) => void;
}) {
  if (mounts.length === 0) {
    return <p className="studio-empty">No mounted extension packs.</p>;
  }

  return (
    <table className="studio-table">
      <thead>
        <tr>
          <th>Mount</th>
          <th>Current pack</th>
          <th>Switch</th>
        </tr>
      </thead>
      <tbody>
        {mounts.map(({ mount, skillPack }) => (
          <tr key={mount.id}>
            <td>
              <strong>{mount.mountKey}</strong>
              <div className="studio-mono">{mount.mountPoint}</div>
            </td>
            <td>
              <strong>{skillPack.displayName}</strong>
              <div className="studio-mono">{skillPack.name}</div>
            </td>
            <td>
              <div className="studio-toolbar">
                <select
                  value={switchTargets[mount.id] ?? mount.skillPackId}
                  onChange={(event) =>
                    onSwitchTargetChange(mount.id, event.target.value)
                  }
                  aria-label={`Switch ${mount.mountKey}`}
                >
                  {extensionPacks.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.displayName}
                    </option>
                  ))}
                </select>
                <button
                  className="studio-button secondary"
                  onClick={() => onSwitch(mount.id)}
                  disabled={switchingMountId === mount.id}
                >
                  {switchingMountId === mount.id ? "Switching..." : "Switch"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ValidationPanel({
  validation,
}: {
  validation: YapMountValidationResult;
}) {
  return (
    <div className="studio-validation">
      <span
        className={
          validation.status === "blocked"
            ? "studio-badge blocked"
            : "studio-badge pass"
        }
      >
        {validation.status}
      </span>
      {validation.issues.length > 0 && (
        <ul>
          {validation.issues.map((issue) => (
            <li key={`${issue.code}-${issue.key ?? issue.message}`}>
              <span className="studio-mono">{issue.code}</span> {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function parseSkillPackDraft(value: string): SkillPackDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Invalid JSON: ${error.message}`
        : "Invalid JSON",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error("SkillPack JSON must be an object");
  }

  const manifest = parsed.manifest;
  if (!isRecord(manifest)) {
    throw new Error("SkillPack JSON requires a manifest object");
  }

  const name = valueString(parsed.name);
  const version = valueString(parsed.version);
  const displayName = valueString(parsed.displayName);
  const description = valueString(parsed.description);
  if (!name || !version || !displayName || !description) {
    throw new Error(
      "SkillPack JSON requires name, version, displayName, description",
    );
  }

  return parsed as SkillPackDraft;
}

function valueString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function yigscriptYapPreset(): CreateYapForm {
  return {
    slug: "yigscript",
    version: "0.7.0",
    displayName: "YigScript",
    description:
      "Product-grade YAP for video script structuring, scene planning, and host-ready script workflow assemblies. It replaces the old Video Script Structurer template with a Yigfinance-style core plus extension architecture.",
    readme:
      "YigScript packages script creation as a YAP product: a stable core shell plus switchable script extension packs. The default extension is Video Script Structurer, mounted at video-script-structurer.",
    category: "script",
    tags: "script, video, creator-tools",
    visibility: "public",
    status: "active",
  };
}

function yigfinanceYapPreset(): CreateYapForm {
  return {
    slug: "yigfinance",
    version: "0.7.0",
    displayName: "Yigfinance",
    description:
      "Finance analysis YAP with a core finance shell and switchable extension packs for specialized project, reporting, and operating review workflows.",
    readme:
      "Yigfinance is the reference YAP architecture: a core pack hosts shared finance context and extension packs mount specialized skill sets such as ETO professional projects.",
    category: "finance",
    tags: "finance, analysis, fp-a, skillpack",
    visibility: "public",
    status: "active",
  };
}

function samplePackJson(yapSlug: string, type: SkillPackType): string {
  const isCore = type === "core";
  const name = isCore ? yapSlug : "eto-professional-projects";
  const skillName = isCore ? "variance-review" : "eto-project-review";
  return JSON.stringify(
    {
      name,
      version: "0.7.0",
      displayName: isCore ? "Yigfinance Core" : "ETO Professional Projects",
      description: isCore
        ? "Core finance analysis pack for Yigfinance."
        : "Engineer-to-order project finance extension pack.",
      packType: type,
      contractVersion: "1.0",
      compatibility: isCore
        ? { yigthinker: ">=0.3.0 <0.5.0", "yigcore-addins": "^0.2.0" }
        : {
            [yapSlug]: ">=0.7.0 <0.8.0",
            yigthinker: ">=0.3.0 <0.5.0",
            "yigcore-addins": "^0.2.0",
          },
      manifest: {
        name,
        version: "0.7.0",
        contract_version: "1.0",
        skills: [
          {
            name: skillName,
            version: "0.7.0",
            status: "stable",
          },
        ],
      },
      artifacts: [
        {
          artifactType: "routes",
          artifactPath: "routes.json",
          content: {
            contract_version: "1.0",
            skills: {
              [skillName]: { next_candidates: [] },
            },
          },
        },
        {
          artifactType: "tool-map",
          artifactPath: "tool-map.json",
          content: {
            contract_version: "1.0",
            mappings: {
              [`finance-calc.${skillName}`]: {
                tool: skillName.replaceAll("-", "_"),
                skill: skillName,
              },
            },
          },
        },
        {
          artifactType: "schema",
          artifactPath: `schemas/${skillName}.schema.json`,
          content: { type: "object", title: `${skillName} schema` },
        },
      ],
    },
    null,
    2,
  );
}

function yigscriptCorePackJson(yapSlug: string): string {
  return JSON.stringify(
    {
      name: yapSlug,
      version: "0.7.0",
      displayName: "YigScript Core",
      description:
        "Core YAP shell for product-grade script creation workflows. It routes requests into mounted script extension packs while preserving host compatibility.",
      packType: "core",
      contractVersion: "1.0",
      compatibility: {
        yigthinker: ">=0.3.0 <0.5.0",
        "yigcore-addins": "^0.2.0",
      },
      manifest: {
        name: yapSlug,
        version: "0.7.0",
        contract_version: "1.0",
        product: {
          slug: yapSlug,
          display_name: "YigScript",
          base_template: "video-script-structurer",
          architecture: "yigfinance-style-core-extension",
          default_mount_key: "video-script-structurer",
        },
        skills: [
          {
            name: "script-project-intake",
            version: "0.7.0",
            status: "stable",
            description:
              "Capture brief, audience, channel, constraints, and target output structure before extension execution.",
          },
          {
            name: "script-assembly-planner",
            version: "0.7.0",
            status: "stable",
            description:
              "Plan which script extension pack should handle structure, scene beats, hooks, and deliverables.",
          },
        ],
        mounts: {
          extension_points: [
            {
              mount_key: "video-script-structurer",
              mount_point: "extensions/video-script-structurer",
              required: false,
              switchable: true,
            },
          ],
        },
      },
      artifacts: [
        {
          artifactType: "routes",
          artifactPath: "routes.json",
          content: {
            contract_version: "1.0",
            default_mount_key: "video-script-structurer",
            skills: {
              "script-project-intake": {
                next_candidates: ["script-assembly-planner"],
              },
              "script-assembly-planner": {
                next_candidates: ["video-script-structurer"],
              },
            },
          },
        },
        {
          artifactType: "tool-map",
          artifactPath: "tool-map.json",
          content: {
            contract_version: "1.0",
            mappings: {
              "script.core.project_intake": {
                tool: "script_project_intake",
                skill: "script-project-intake",
              },
              "script.core.assembly_planner": {
                tool: "script_assembly_planner",
                skill: "script-assembly-planner",
              },
            },
          },
        },
        {
          artifactType: "schema",
          artifactPath: "schemas/script-project-intake.schema.json",
          content: {
            type: "object",
            title: "YigScript project intake",
            properties: {
              brief: { type: "string" },
              audience: { type: "string" },
              channel: { type: "string" },
              durationSeconds: { type: "number" },
            },
            required: ["brief"],
          },
        },
        {
          artifactType: "command",
          artifactPath: "commands/yigscript-plan.json",
          content: {
            command: "yigscript.plan",
            skill: "script-assembly-planner",
            mount_key: "video-script-structurer",
          },
        },
        {
          artifactType: "skill-md",
          artifactPath: "skills/script-project-intake/SKILL.md",
          mediaType: "text/markdown",
          content:
            "# Script Project Intake\n\nCapture the creative brief, target audience, format, constraints, and success criteria before routing to a mounted script extension pack.\n",
        },
      ],
    },
    null,
    2,
  );
}

function videoScriptStructurerPackJson(yapSlug: string): string {
  return JSON.stringify(
    {
      name: "video-script-structurer",
      version: "0.7.0",
      displayName: "Video Script Structurer",
      description:
        "Default YigScript extension pack that preserves the original Video Script Structurer template behavior as a mountable, switchable SkillPack.",
      packType: "extension",
      contractVersion: "1.0",
      compatibility: {
        [yapSlug]: ">=0.7.0 <0.8.0",
        yigthinker: ">=0.3.0 <0.5.0",
        "yigcore-addins": "^0.2.0",
      },
      manifest: {
        name: "video-script-structurer",
        version: "0.7.0",
        contract_version: "1.0",
        mount: {
          key: "video-script-structurer",
          point: "extensions/video-script-structurer",
          default_for: yapSlug,
          switchable: true,
        },
        replaces_template: "Video Script Structurer",
        skills: [
          {
            name: "video-script-structurer",
            version: "0.7.0",
            status: "stable",
            description:
              "Transform a creative brief into a structured video script with sections, beats, narration, and production notes.",
          },
          {
            name: "hook-generator",
            version: "0.7.0",
            status: "stable",
            description:
              "Generate opening hooks tailored to platform, audience, and retention goals.",
          },
          {
            name: "shot-list-builder",
            version: "0.7.0",
            status: "stable",
            description:
              "Convert the approved script into shot list, scene coverage, and b-roll prompts.",
          },
        ],
      },
      artifacts: [
        {
          artifactType: "routes",
          artifactPath: "routes.json",
          content: {
            contract_version: "1.0",
            mount_key: "video-script-structurer",
            skills: {
              "video-script-structurer": {
                next_candidates: ["hook-generator", "shot-list-builder"],
              },
              "hook-generator": {
                next_candidates: ["video-script-structurer"],
              },
              "shot-list-builder": { next_candidates: [] },
            },
          },
        },
        {
          artifactType: "tool-map",
          artifactPath: "tool-map.json",
          content: {
            contract_version: "1.0",
            mappings: {
              "script.video.structure": {
                tool: "video_script_structurer",
                skill: "video-script-structurer",
              },
              "script.video.hooks": {
                tool: "hook_generator",
                skill: "hook-generator",
              },
              "script.video.shot_list": {
                tool: "shot_list_builder",
                skill: "shot-list-builder",
              },
            },
          },
        },
        {
          artifactType: "schema",
          artifactPath: "schemas/video-script-structurer.schema.json",
          content: {
            type: "object",
            title: "Video Script Structurer input",
            properties: {
              brief: { type: "string" },
              tone: { type: "string" },
              targetLength: { type: "string" },
              platform: { type: "string" },
              sections: { type: "array", items: { type: "string" } },
            },
            required: ["brief"],
          },
        },
        {
          artifactType: "command",
          artifactPath: "commands/yigscript-structure-video.json",
          content: {
            command: "yigscript.structureVideo",
            skill: "video-script-structurer",
            mount_key: "video-script-structurer",
          },
        },
        {
          artifactType: "skill-md",
          artifactPath: "skills/video-script-structurer/SKILL.md",
          mediaType: "text/markdown",
          content:
            "# Video Script Structurer\n\nCreate a production-ready script structure with hook, context, scene beats, narration, visual direction, CTA, and revision notes. This SkillPack is mounted into YigScript and can be swapped without code changes.\n",
        },
      ],
    },
    null,
    2,
  );
}
