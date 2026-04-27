/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ResolvedYapManifest } from "@yigyaps/types";
import { YapAssemblyPage } from "../pages/YapAssemblyPage";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    openAuthModal: vi.fn(),
  }),
}));

describe("YapAssemblyPage", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("renders the resolved YAP graph, mounted packs, conflicts, and artifacts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeAssembly(),
    });

    renderAssemblyPage();

    expect(await screen.findByText("Yigfinance")).toBeTruthy();
    expect(screen.getByText("Pack Graph")).toBeTruthy();
    expect(screen.getAllByText("ETO Professional Projects").length).toBe(2);
    expect(screen.getByText("Conflict Status")).toBeTruthy();
    expect(screen.getByText("duplicate route")).toBeTruthy();
    expect(screen.getByText("schemas/eto.schema.json")).toBeTruthy();
    expect(mockFetch.mock.calls[0][0]).toContain(
      "/v1/yaps/yigfinance/assembly",
    );
  });

  it("filters resolved artifacts by artifact type", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeAssembly(),
    });

    renderAssemblyPage();

    expect(await screen.findByText("commands/eto.md")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Schema" }));

    await waitFor(() => {
      expect(screen.queryByText("commands/eto.md")).toBeNull();
    });
    expect(screen.getByText("schemas/eto.schema.json")).toBeTruthy();
  });
});

function renderAssemblyPage() {
  render(
    <MemoryRouter initialEntries={["/yaps/yigfinance/assembly"]}>
      <Routes>
        <Route
          path="/yaps/:yapId/assembly"
          element={<YapAssemblyPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function fakeAssembly(): ResolvedYapManifest {
  return {
    yap: {
      id: "yap_test",
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      description: "Finance analysis YAP",
      readme: null,
      ownerId: "u1",
      ownerName: "User",
      category: "finance",
      tags: ["finance"],
      visibility: "public",
      status: "active",
      assemblyConfig: {},
      createdAt: 1,
      updatedAt: 1,
      releasedAt: 1,
    },
    corePack: {
      role: "core",
      mount: null,
      skillPack: {
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
      },
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
    mountedPacks: [
      {
        role: "mount",
        mount: {
          id: "mount_eto",
          yapId: "yap_test",
          skillPackId: "spack_eto",
          mountKey: "eto",
          mountPoint: "extensions",
          displayName: "ETO",
          priority: 20,
          enabled: true,
          required: false,
          config: {},
          constraints: {},
          createdAt: 1,
          updatedAt: 1,
        },
        skillPack: {
          id: "spack_eto",
          yapId: "yap_test",
          name: "eto-professional-projects",
          version: "1.2.3",
          displayName: "ETO Professional Projects",
          description: "Project analysis pack",
          packType: "extension",
          contractVersion: "1.0",
          compatibility: {},
          manifest: {},
          source: "imported",
          status: "active",
          createdAt: 1,
          updatedAt: 1,
          releasedAt: 1,
        },
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
    ],
    merged: {
      contractVersion: "1.0",
      packOrder: ["spack_core", "spack_eto"],
      skills: [
        {
          name: "variance-review",
          version: "0.7.0",
          sourcePackId: "spack_core",
          sourcePackName: "yigfinance",
          sourceMountKey: null,
          definition: {},
        },
        {
          name: "eto-projects",
          version: "1.2.3",
          sourcePackId: "spack_eto",
          sourcePackName: "eto-professional-projects",
          sourceMountKey: "eto",
          definition: {},
        },
      ],
      routes: {
        skills: {
          "variance-review": {},
          "eto-projects": {},
        },
      },
      toolMap: {
        mappings: {
          "eto.projects": {},
        },
      },
      schemas: {
        "schemas/eto.schema.json": {},
      },
      artifactIndex: [
        {
          id: "artifact_command",
          artifactType: "command",
          artifactPath: "commands/eto.md",
          mediaType: "text/markdown",
          contentSha256: "1234567890abcdef",
          sourcePackId: "spack_eto",
          sourcePackName: "eto-professional-projects",
          sourceMountKey: "eto",
        },
        {
          id: "artifact_schema",
          artifactType: "schema",
          artifactPath: "schemas/eto.schema.json",
          mediaType: "application/schema+json",
          contentSha256: "abcdef1234567890",
          sourcePackId: "spack_eto",
          sourcePackName: "eto-professional-projects",
          sourceMountKey: "eto",
        },
      ],
    },
    diagnostics: {
      conflicts: [
        {
          kind: "route",
          key: "duplicate route",
          sourcePackIds: ["spack_core", "spack_eto"],
          message: "Route key is defined by multiple packs.",
        },
      ],
      warnings: [],
    },
    generatedAt: 1,
  };
}
