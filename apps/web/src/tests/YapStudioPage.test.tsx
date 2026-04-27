/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { YapStudioPage } from "../pages/YapStudioPage";

const addToast = vi.fn();

vi.mock("../components/Header", () => ({
  Header: () => <header>Header</header>,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "usr_test",
      githubUsername: "tester",
      displayName: "Tester",
      tier: "legendary",
      role: "admin",
      isVerifiedCreator: true,
      totalPackages: 0,
      totalEarningsUsd: "0",
      createdAt: 1,
      lastLoginAt: 1,
    },
  }),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ addToast }),
}));

describe("YapStudioPage", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.includes("/v1/yaps?mine=true")) {
          return jsonResponse({
            yaps: [fakeYap()],
            total: 1,
            limit: 50,
            offset: 0,
          });
        }

        if (method === "GET" && url.includes("/skill-packs")) {
          return jsonResponse({
            skillPacks: [fakeCorePack(), fakeExtensionPack()],
            total: 2,
          });
        }

        if (method === "GET" && url.includes("/mounts")) {
          return jsonResponse({
            mounts: [fakeMount()],
            total: 1,
            limit: 100,
            offset: 0,
          });
        }

        if (method === "GET" && url.includes("/assembly")) {
          return jsonResponse(fakeAssembly());
        }

        if (method === "POST" && url.endsWith("/v1/yaps")) {
          return jsonResponse({ ...fakeYap(), id: "yap_new", slug: "new-yap" });
        }

        if (method === "POST" && url.endsWith("/v1/yap-imports/preview")) {
          return jsonResponse(fakeImportPreview());
        }

        if (method === "POST" && url.endsWith("/v1/yap-imports/execute")) {
          return jsonResponse(fakeImportExecuteResult());
        }

        if (method === "POST" && url.includes("/mount-validations")) {
          return jsonResponse({
            status: "pass",
            issues: [],
            candidate: {
              yapId: "yap_test",
              skillPackId: "spack_eto",
              mountKey: "default-project-pack",
              enabled: true,
              replacingMountId: null,
            },
            summary: {
              packOrder: ["spack_core", "spack_eto"],
              skillCount: 2,
              routeCount: 2,
              toolMappingCount: 2,
              schemaCount: 2,
            },
            generatedAt: 1,
          });
        }

        if (method === "POST" && url.includes("/mounts")) {
          return jsonResponse(fakeMount());
        }

        if (method === "PATCH" && url.includes("/mounts/")) {
          return jsonResponse(fakeMount());
        }

        if (method === "POST" && url.includes("/skill-packs")) {
          return jsonResponse({
            skillPack: fakeExtensionPack(),
            artifacts: [],
          });
        }

        return jsonResponse({ error: "Unhandled mock route" }, false, 404);
      },
    );
  });

  it("loads the selected YAP workspace", async () => {
    renderStudio();

    expect(await screen.findByText("Yigfinance")).toBeTruthy();
    expect(screen.getByText("yigfinance")).toBeTruthy();
    expect(await screen.findByText("Yigfinance Core")).toBeTruthy();
    expect(
      screen.getAllByText("ETO Professional Projects").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("default-project-pack")).toBeTruthy();
  });

  it("creates a YAP with assembly config", async () => {
    renderStudio();
    await screen.findByText("Yigfinance");

    await userEvent.type(screen.getByLabelText("Slug"), "new-yap");
    await userEvent.type(screen.getByLabelText("Display name"), "New YAP");
    await userEvent.type(
      screen.getByLabelText("Description"),
      "A new advanced YAP for testing.",
    );
    await userEvent.clear(screen.getByLabelText("Category"));
    await userEvent.type(screen.getByLabelText("Category"), "script");
    await userEvent.type(screen.getByLabelText("Tags"), "script, video, script");
    await userEvent.type(
      screen.getByLabelText("Readme"),
      "This YAP is created with product metadata.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create YAP" }));

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(([url, init]) => {
          if (!String(url).endsWith("/v1/yaps") || init?.method !== "POST") {
            return false;
          }
          const body = JSON.parse(String(init.body));
          return (
            body.slug === "new-yap" &&
            body.category === "script" &&
            body.tags.length === 2 &&
            body.tags[0] === "script" &&
            body.tags[1] === "video" &&
            body.readme === "This YAP is created with product metadata." &&
            body.assemblyConfig.corePack.name === "new-yap"
          );
        }),
      ).toBe(true);
    });
  });

  it("applies YigScript product and SkillPack presets", async () => {
    const { container } = renderStudio();
    await screen.findByText("Yigfinance");

    expect(screen.getByRole("tab", { name: "Template" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Repo import" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Blank" })).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Apply YigScript template" }),
    );

    expect(screen.getByLabelText("Slug")).toHaveValue("yigscript");
    expect(screen.getByLabelText("Category")).toHaveValue("script");
    expect(screen.getByLabelText("Tags")).toHaveValue(
      "script, video, creator-tools",
    );
    expect(screen.getByLabelText("Mount key")).toHaveValue(
      "video-script-structurer",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Video script extension" }),
    );

    const editor = container.querySelector<HTMLTextAreaElement>(
      "textarea.studio-json",
    );
    expect(editor?.value).toContain('"name": "video-script-structurer"');
    expect(editor?.value).toContain('"packType": "extension"');

    await userEvent.click(
      screen.getByRole("button", { name: "Publish SkillPack" }),
    );

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(([url, init]) => {
          if (!String(url).includes("/skill-packs") || init?.method !== "POST") {
            return false;
          }
          const body = JSON.parse(String(init.body));
          return (
            body.name === "video-script-structurer" &&
            body.packType === "extension" &&
            body.compatibility.yigfinance === ">=0.7.0 <0.8.0"
          );
        }),
      ).toBe(true);
    });
  });

  it("stages a repo import shell without pretending to import content", async () => {
    renderStudio();
    await screen.findByText("Yigfinance");

    await userEvent.click(screen.getByRole("tab", { name: "Repo import" }));

    expect(screen.getByLabelText("Repository path")).toHaveValue("Yigfinance");

    await userEvent.click(
      screen.getByRole("button", { name: "Stage import shell" }),
    );

    expect(screen.getByLabelText("Slug")).toHaveValue("yigfinance");
    expect(screen.getByLabelText("Category")).toHaveValue("finance");
    expect(screen.getByLabelText("Mount key")).toHaveValue(
      "default-project-pack",
    );
  });

  it("previews a repo import and surfaces real repository scale", async () => {
    renderStudio();
    await screen.findByText("Yigfinance");

    await userEvent.click(screen.getByRole("tab", { name: "Repo import" }));
    await userEvent.click(screen.getByRole("button", { name: "Preview import" }));

    expect(await screen.findByLabelText("Import preview")).toBeTruthy();
    expect(screen.getAllByText("33").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("32")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("needs-run")).toBeTruthy();
    expect(screen.getByText("82")).toBeTruthy();
    expect(screen.getByLabelText("Slug")).toHaveValue("yigfinance");
    expect(screen.getByLabelText("Mount key")).toHaveValue("eto");

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(([url, init]) => {
          if (!String(url).endsWith("/v1/yap-imports/preview")) return false;
          const body = JSON.parse(String(init?.body));
          return (
            init?.method === "POST" &&
            body.format === "yigfinance" &&
            body.sourceDir === "Yigfinance"
          );
        }),
      ).toBe(true);
    });
  });

  it("executes a repo import after preview", async () => {
    renderStudio();
    await screen.findByText("Yigfinance");

    await userEvent.click(screen.getByRole("tab", { name: "Repo import" }));
    expect(screen.getByRole("button", { name: "Execute import" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Preview import" }));
    await screen.findByLabelText("Import preview");
    await userEvent.click(screen.getByRole("button", { name: "Execute import" }));

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(([url, init]) => {
          if (!String(url).endsWith("/v1/yap-imports/execute")) return false;
          const body = JSON.parse(String(init?.body));
          return (
            init?.method === "POST" &&
            body.format === "yigfinance" &&
            body.sourceDir === "Yigfinance"
          );
        }),
      ).toBe(true);
    });
  });

  it("validates before mounting an extension pack", async () => {
    renderStudio();
    await screen.findByText("Yigfinance");

    await userEvent.click(
      screen.getByRole("button", { name: "Validate and mount" }),
    );

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/mount-validations") &&
            init?.method === "POST",
        ),
      ).toBe(true);
      expect(
        mockFetch.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/mounts") && init?.method === "POST",
        ),
      ).toBe(true);
    });
  });
});

function renderStudio() {
  return render(
    <MemoryRouter>
      <YapStudioPage />
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function fakeYap() {
  return {
    id: "yap_test",
    slug: "yigfinance",
    version: "0.7.0",
    displayName: "Yigfinance",
    description: "Finance analysis YAP",
    readme: null,
    ownerId: "usr_test",
    ownerName: "Tester",
    category: "finance",
    tags: ["finance"],
    visibility: "public",
    status: "active",
    assemblyConfig: {},
    createdAt: 1,
    updatedAt: 1,
    releasedAt: 1,
  };
}

function fakeCorePack() {
  return {
    id: "spack_core",
    yapId: "yap_test",
    name: "yigfinance",
    version: "0.7.0",
    displayName: "Yigfinance Core",
    description: "Core finance pack",
    packType: "core",
    contractVersion: "1.0",
    compatibility: {},
    manifest: {},
    source: "imported",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    releasedAt: 1,
  };
}

function fakeExtensionPack() {
  return {
    id: "spack_eto",
    yapId: "yap_test",
    name: "eto-professional-projects",
    version: "0.7.0",
    displayName: "ETO Professional Projects",
    description: "ETO pack",
    packType: "extension",
    contractVersion: "1.0",
    compatibility: { yigfinance: ">=0.7.0 <0.8.0" },
    manifest: {},
    source: "imported",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    releasedAt: 1,
  };
}

function fakeMount() {
  return {
    mount: {
      id: "ymnt_eto",
      yapId: "yap_test",
      skillPackId: "spack_eto",
      mountKey: "default-project-pack",
      mountPoint: "extensions/project",
      displayName: "ETO Professional Projects",
      priority: 10,
      enabled: true,
      required: false,
      config: {},
      constraints: {},
      createdAt: 1,
      updatedAt: 1,
    },
    skillPack: fakeExtensionPack(),
  };
}

function fakeAssembly() {
  return {
    yap: fakeYap(),
    corePack: {
      role: "core",
      mount: null,
      skillPack: fakeCorePack(),
      artifacts: {
        manifest: {},
        routes: null,
        toolMap: null,
        feedback: null,
        update: null,
        schemas: {},
        artifactIndex: [],
      },
    },
    mountedPacks: [],
    merged: {
      contractVersion: "1.0",
      packOrder: ["spack_core", "spack_eto"],
      skills: [
        {
          name: "variance-review",
          sourcePackId: "spack_core",
          sourcePackName: "yigfinance",
          sourceMountKey: null,
          definition: {},
        },
        {
          name: "eto-project-review",
          sourcePackId: "spack_eto",
          sourcePackName: "eto-professional-projects",
          sourceMountKey: "default-project-pack",
          definition: {},
        },
      ],
      routes: { skills: {} },
      toolMap: { mappings: {} },
      schemas: {},
      artifactIndex: [],
    },
    diagnostics: {
      conflicts: [],
      warnings: [],
    },
    generatedAt: 1,
  };
}

function fakeImportPreview() {
  return {
    format: "yigfinance",
    source: {
      sourceDir: "/workspace-imports/Yigfinance",
      pluginDir: "/workspace-imports/Yigfinance/generated/yigthinker/.yigthinker-plugin",
      commandsDir: "/workspace-imports/Yigfinance/generated/yigthinker/commands",
      skillsDir: "/workspace-imports/Yigfinance/generated/claude/skills",
      testsDir: "/workspace-imports/Yigfinance/tests",
    },
    yap: {
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      description: "Finance analysis skill stack for CFO-grade financial analysis",
      category: "finance",
      tags: ["finance", "cfo", "analysis", "yigfinance"],
      visibility: "public",
      status: "active",
    },
    corePack: {
      name: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      packType: "core",
      contractVersion: "1.0",
      skillCount: 25,
      artifactCount: 63,
    },
    extensionPacks: [
      {
        name: "yigfinance-eto-professional-projects",
        version: "0.7.0",
        displayName: "Yigfinance ETO Professional Projects",
        packType: "extension",
        contractVersion: "1.0",
        skillCount: 8,
        artifactCount: 19,
      },
    ],
    defaultMounts: [
      {
        skillPackName: "yigfinance-eto-professional-projects",
        skillPackVersion: "0.7.0",
        mountKey: "eto",
        mountPoint: "extensions",
        displayName: "ETO Project Pack",
        priority: 20,
        enabled: true,
        required: false,
      },
    ],
    summary: {
      skillCount: 33,
      coreSkillCount: 25,
      schemaCount: 32,
      commandCount: 33,
      skillMarkdownCount: 33,
      evalArtifactCount: 42,
      qualityReportStatus: "needs-run",
      artifactCount: 82,
      extensionPackCount: 1,
      extensionSkillCount: 8,
      defaultMountCount: 1,
    },
    warnings: [],
    generatedAt: 1,
  };
}

function fakeImportExecuteResult() {
  return {
    success: true,
    preview: fakeImportPreview(),
    yap: {
      id: "yap_yigfinance",
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
    },
    yapAction: "created",
    corePack: {
      id: "spack_core",
      name: "yigfinance",
      version: "0.7.0",
      packType: "core",
      action: "created",
      artifactCount: 63,
    },
    extensionPacks: [
      {
        id: "spack_eto",
        name: "yigfinance-eto-professional-projects",
        version: "0.7.0",
        packType: "extension",
        action: "created",
        artifactCount: 19,
      },
    ],
    defaultMounts: [
      {
        id: "ymnt_eto",
        mountKey: "eto",
        mountPoint: "extensions",
        skillPackId: "spack_eto",
        action: "created",
      },
    ],
    assemblyUrl: "/v1/yaps/yigfinance/assembly",
  };
}
