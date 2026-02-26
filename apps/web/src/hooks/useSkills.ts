import { useState, useEffect } from "react";
import { YigYapsRegistryClient } from "@yigyaps/client";
import type { SkillPackage, SkillPackageSearchQuery } from "@yigyaps/types";
import { API_URL } from "../lib/api";

export function useSkills(searchParams?: SkillPackageSearchQuery) {
  const [skills, setSkills] = useState<SkillPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        // Use VITE_API_URL from .env or fallback to localhost
        const client = new YigYapsRegistryClient({
          baseUrl: API_URL,
        });

        // Search API returns SkillPackageSearchResult with packages array
        const response = await client.search(
          searchParams || {
            sortBy: "popularity",
            limit: 20,
          },
        );
        setSkills(response.packages || []);
        setTotal(response.total || 0);
      } catch (err) {
        console.error("Failed to fetch skills:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to communicate with YigYaps API";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams?.query,
    searchParams?.category,
    searchParams?.license,
    searchParams?.maturity,
    searchParams?.minRating,
    searchParams?.maxPriceUsd,
    searchParams?.sortBy,
    searchParams?.limit,
    searchParams?.offset,
  ]);

  return { skills, total, loading, error };
}
