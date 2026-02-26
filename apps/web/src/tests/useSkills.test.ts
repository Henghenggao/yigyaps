/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSkills } from "../hooks/useSkills";

describe("useSkills", () => {
  const mockSkillsData = {
    packages: [
      {
        id: "skill-1",
        packageId: "test-skill-1",
        displayName: "Test Skill 1",
        description: "Description 1",
        installCount: 100,
        rating: 4.5,
      },
      {
        id: "skill-2",
        packageId: "test-skill-2",
        displayName: "Test Skill 2",
        description: "Description 2",
        installCount: 50,
        rating: 4.0,
      },
    ],
    total: 2,
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("fetches skills successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSkillsData,
    });

    const { result } = renderHook(() => useSkills({}));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.skills).toEqual(mockSkillsData.packages);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("handles API errors gracefully", async () => {
    const errorMessage = "Failed to fetch";
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useSkills({}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.skills).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it("constructs correct query parameters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSkillsData,
    });

    const query = {
      query: "test",
      category: "development" as const,
      limit: 20,
      offset: 0,
    };

    renderHook(() => useSkills(query));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Check if fetch was called with correct URL parameters
    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain("query=test");
    expect(fetchUrl).toContain("category=development");
  });

  it("refetches data when query changes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSkillsData,
    });

    const { rerender } = renderHook(({ query }) => useSkills(query), {
      initialProps: { query: { query: "initial" } },
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Update query
    rerender({ query: { query: "updated" } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("handles empty results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        packages: [],
        total: 0,
      }),
    });

    const { result } = renderHook(() => useSkills({}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.skills).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
