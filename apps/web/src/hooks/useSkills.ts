import { useState, useEffect } from 'react';
import { YigYapsRegistryClient } from '@yigyaps/client';

export interface Skill {
    id: string;
    name: string;
    description: string;
    creatorId: string;
    mintQuota: number | null;
    mintCount: number;
}

export function useSkills() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                setLoading(true);
                // Ensure to fallback to sensible defaults
                const client = new YigYapsRegistryClient({
                    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3100/v1'
                });

                // Search API returns a paginated listing
                const response = await client.search({});
                const dataList = Array.isArray(response) ? response : (response.packages || response.items || []);
                setSkills(dataList);
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
