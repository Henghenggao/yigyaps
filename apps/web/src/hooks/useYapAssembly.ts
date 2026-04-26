import { useEffect, useState } from "react";
import type { ResolvedYapManifest } from "@yigyaps/types";
import { fetchApi } from "../lib/api";

interface UseYapAssemblyState {
  assembly: ResolvedYapManifest | null;
  loading: boolean;
  error: string | null;
}

export function useYapAssembly(yapIdOrSlug: string): UseYapAssemblyState {
  const [assembly, setAssembly] = useState<ResolvedYapManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadAssembly = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchApi<ResolvedYapManifest>(
          `/v1/yaps/${encodeURIComponent(yapIdOrSlug)}/assembly`,
        );
        if (!active) return;
        setAssembly(data);
      } catch (err) {
        if (!active) return;
        setAssembly(null);
        setError(err instanceof Error ? err.message : "Failed to load YAP");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAssembly();

    return () => {
      active = false;
    };
  }, [yapIdOrSlug]);

  return { assembly, loading, error };
}
