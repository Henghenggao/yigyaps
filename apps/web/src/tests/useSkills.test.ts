import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSkills } from '../hooks/useSkills';
import * as api from '../lib/api';

// Mock the API module
vi.mock('../lib/api', () => ({
  fetchApi: vi.fn(),
}));

describe('useSkills', () => {
  const mockSkillsData = {
    packages: [
      {
        id: 'skill-1',
        packageId: 'test-skill-1',
        displayName: 'Test Skill 1',
        description: 'Description 1',
        installCount: 100,
        rating: 4.5,
      },
      {
        id: 'skill-2',
        packageId: 'test-skill-2',
        displayName: 'Test Skill 2',
        description: 'Description 2',
        installCount: 50,
        rating: 4.0,
      },
    ],
    total: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches skills successfully', async () => {
    (api.fetchApi as any).mockResolvedValueOnce(mockSkillsData);

    const { result } = renderHook(() => useSkills({}));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.skills).toEqual(mockSkillsData.packages);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch skills';
    (api.fetchApi as any).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useSkills({}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.skills).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('constructs correct query parameters', async () => {
    (api.fetchApi as any).mockResolvedValueOnce(mockSkillsData);

    const query = {
      q: 'test',
      category: 'development' as const,
      limit: 20,
      offset: 0,
    };

    renderHook(() => useSkills(query));

    await waitFor(() => {
      expect(api.fetchApi).toHaveBeenCalled();
    });

    // Check if API was called with correct endpoint including query params
    const callArgs = (api.fetchApi as any).mock.calls[0];
    expect(callArgs[0]).toContain('/v1/packages');
    expect(callArgs[0]).toContain('q=test');
    expect(callArgs[0]).toContain('category=development');
  });

  it('refetches data when query changes', async () => {
    (api.fetchApi as any).mockResolvedValue(mockSkillsData);

    const { rerender } = renderHook(
      ({ query }) => useSkills(query),
      {
        initialProps: { query: { q: 'initial' } },
      }
    );

    await waitFor(() => {
      expect(api.fetchApi).toHaveBeenCalledTimes(1);
    });

    // Update query
    rerender({ query: { q: 'updated' } });

    await waitFor(() => {
      expect(api.fetchApi).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty results', async () => {
    (api.fetchApi as any).mockResolvedValueOnce({
      packages: [],
      total: 0,
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
