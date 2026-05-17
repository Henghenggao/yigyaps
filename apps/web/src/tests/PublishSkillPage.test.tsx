/** @vitest-environment jsdom */
import "./setup";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PublishSkillPage } from "../pages/PublishSkillPage";

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  navigate: vi.fn(),
  openAuthModal: vi.fn(),
}));

const fetchMock = vi.fn();

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "usr_author",
      githubUsername: "author",
      displayName: "Author",
      avatarUrl: "",
      tier: "free",
      role: "user",
      isVerifiedCreator: true,
      totalPackages: 0,
      totalEarningsUsd: "0",
      createdAt: 0,
      lastLoginAt: 0,
    },
    openAuthModal: mocks.openAuthModal,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

describe("PublishSkillPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.includes("/v1/packages/by-pkg/")) {
          return jsonResponse({ error: "Package not found" }, false, 404);
        }

        if (method === "POST" && url.endsWith("/v1/packages")) {
          return jsonResponse({ id: "spkg_1", packageId: "test-skill" });
        }

        if (
          method === "POST" &&
          url.includes("/v1/security/knowledge/test-skill")
        ) {
          return jsonResponse({
            success: true,
            expert_share: "share-index-2",
            shamir_notice: "IMPORTANT",
          });
        }

        return jsonResponse({ error: "Unhandled mock route" }, false, 500);
      },
    );
  });

  it("requires the creator to explicitly save the returned expert share", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PublishSkillPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText("e.g. legal-contract-reviewer"),
      "test-skill",
    );
    await user.type(
      screen.getByPlaceholderText("Legal Contract Reviewer Pro"),
      "Test Skill",
    );
    await user.type(
      screen.getByPlaceholderText(/reviews contracts/),
      "A secure skill for testing protected publishing.",
    );
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.type(
      screen.getByPlaceholderText(/knowledge, rules, and decision logic/),
      "private rules",
    );
    await user.click(screen.getByRole("button", { name: /Publish/ }));

    expect(await screen.findByText("Save Expert Share")).toBeInTheDocument();
    expect(screen.getByLabelText("Expert share")).toHaveValue("share-index-2");
    expect(sessionStorage.getItem("yigyaps_expert_share:test-skill")).toBe(
      "share-index-2",
    );
    expect(mocks.navigate).not.toHaveBeenCalledWith("/skill/test-skill");

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: /I saved this expert share somewhere durable/,
      }),
    );
    await waitFor(() => expect(continueButton).toBeEnabled());
    await user.click(continueButton);

    expect(mocks.navigate).toHaveBeenCalledWith("/skill/test-skill");
  });
});

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
