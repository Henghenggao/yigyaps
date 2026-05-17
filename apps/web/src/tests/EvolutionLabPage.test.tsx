/** @vitest-environment jsdom */
import "./setup";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EvolutionLabPage } from "../pages/EvolutionLabPage";

const addToast = vi.fn();
const mockFetch = vi.fn();

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ addToast }),
}));

describe("EvolutionLabPage expert share flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal("fetch", mockFetch);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows the expert-share prompt when Shamir rules require a share", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: "Shamir Share Required",
          message: "Provide expert share to retrieve plaintext rules.",
        },
        false,
        400,
      ),
    );

    renderLab();

    expect(
      await screen.findByText("Enter the expert share to load and test encrypted rules."),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste share_index 2")).toBeInTheDocument();

    const firstRequest = mockFetch.mock.calls[0]?.[1] as RequestInit;
    expect((firstRequest.headers as Headers).get("x-yigyaps-expert-share")).toBeNull();
  });

  it("stores the expert share in session storage and reloads rules with the share header", async () => {
    mockFetch.mockImplementation(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const shareHeader = (init?.headers as Headers).get(
          "x-yigyaps-expert-share",
        );

        if (shareHeader === "share-2") {
          return jsonResponse({ plaintextRules: SAMPLE_RULES });
        }

        return jsonResponse(
          {
            error: "Shamir Share Required",
            message: "Provide expert share to retrieve plaintext rules.",
          },
          false,
          400,
        );
      },
    );

    const user = userEvent.setup();
    renderLab();

    await screen.findByText("Enter the expert share to load and test encrypted rules.");

    await user.type(screen.getByPlaceholderText("Paste share_index 2"), "share-2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(sessionStorage.getItem("yigyaps_expert_share:test-skill")).toBe(
      "share-2",
    );
    expect(await screen.findByText("Rules Editor")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/plaintext rules/)).toHaveValue(
      SAMPLE_RULES,
    );

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(([, init]) =>
          ((init as RequestInit).headers as Headers).get(
            "x-yigyaps-expert-share",
          ) === "share-2",
        ),
      ).toBe(true);
    });
  });

  it("sends expert_share when invoking the lab test flow", async () => {
    sessionStorage.setItem("yigyaps_expert_share:test-skill", "share-2");

    mockFetch.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.includes("/v1/security/knowledge/test-skill")) {
          return jsonResponse({ plaintextRules: SAMPLE_RULES });
        }

        if (method === "POST" && url.includes("/v1/security/invoke/test-skill")) {
          return jsonResponse({
            conclusion: "Lab answer",
            mode: "local",
            privacy_notice: "LOCAL MODE",
          });
        }

        return jsonResponse({ error: "Unhandled mock route" }, false, 404);
      },
    );

    const user = userEvent.setup();
    renderLab();

    await screen.findByText("Rules Editor");

    await user.type(screen.getByPlaceholderText(/Enter a query/), "Evaluate this");
    await user.click(screen.getByRole("button", { name: "Test" }));
    await user.click(await screen.findByRole("button", { name: /I understand/ }));

    expect(await screen.findByText("Lab answer")).toBeInTheDocument();

    const invokeCall = mockFetch.mock.calls.find(([input, init]) => {
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      return (
        method === "POST" &&
        String(input).includes("/v1/security/invoke/test-skill")
      );
    });
    expect(invokeCall).toBeDefined();
    expect(JSON.parse(String((invokeCall?.[1] as RequestInit).body))).toMatchObject({
      user_query: "Evaluate this",
      expert_share: "share-2",
    });
  });
});

const SAMPLE_RULES = JSON.stringify(
  [{ id: "rule-1", dimension: "quality", conclusion: "good" }],
  null,
  2,
);

function renderLab() {
  render(
    <MemoryRouter initialEntries={["/lab/test-skill"]}>
      <Routes>
        <Route path="/lab/:packageId" element={<EvolutionLabPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
