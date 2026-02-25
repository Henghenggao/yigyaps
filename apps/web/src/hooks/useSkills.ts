import { useState, useEffect } from 'react';
import { YigYapsRegistryClient } from '@yigyaps/client';
import type { SkillPackage } from '@yigyaps/types';

export function useSkills() {
    const [skills, setSkills] = useState<SkillPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                setLoading(true);
                // Use VITE_API_URL from .env or fallback to localhost
                const client = new YigYapsRegistryClient({
                    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3100'
                });

                // Search API returns SkillPackageSearchResult with packages array
                const response = await client.search({
                    sortBy: 'popularity',
                    limit: 20
                });
                setSkills(response.packages || []);
            } catch (err: any) {
                console.error('Failed to fetch skills:', err);
                setError(err.message || 'Failed to communicate with YigYaps API');
            } finally {
                setLoading(false);
            }
        };

        fetchSkills();
    }, []);

    return { skills, loading, error };
}
