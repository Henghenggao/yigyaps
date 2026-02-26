/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  fetchApi: vi.fn(),
  API_URL: "http://test",
}));

const TestComponent = () => {
  const { user, loading, error } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (user) return <div>Logged in as {user.displayName}</div>;
  return <div>Not logged in</div>;
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("provides user data on successful fetch", async () => {
    const mockUser = {
      id: "1",
      githubUsername: "test",
      displayName: "Test User",
      tier: "free",
      role: "user",
      isVerifiedCreator: false,
      totalPackages: 0,
      totalEarningsUsd: "0.0000",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    vi.mocked(api.fetchApi).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("Logged in as Test User")).toBeTruthy();
    });
  });

  it("handles fetch failure and clears user", async () => {
    vi.mocked(api.fetchApi).mockRejectedValueOnce(new Error("Network error"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("Error: Network error")).toBeTruthy();
    });
  });
});
