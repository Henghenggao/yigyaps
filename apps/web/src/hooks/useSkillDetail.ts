import { useState, useEffect } from 'react';
import { YigYapsRegistryClient } from '@yigyaps/client';
import type { SkillPackage, SkillPackageReview } from '@yigyaps/types';
import { API_URL, fetchApi } from '../lib/api';

export function useSkillDetail(packageId: string) {
  const [skillDetail, setSkillDetail] = useState<SkillPackage | null>(null);
  const [reviews, setReviews] = useState<SkillPackageReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReviews = async () => {
    try {
      const data = await fetchApi<{ reviews: SkillPackageReview[] }>(`/v1/reviews/${packageId}`);
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to refresh reviews:', err);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const client = new YigYapsRegistryClient({ baseUrl: API_URL });

        // Parallel fetch for better performance
        const [pkg, reviewsData] = await Promise.all([
          client.getByPackageId(packageId),
          fetchApi<{ reviews: SkillPackageReview[] }>(`/v1/reviews/${packageId}`),
        ]);

        setSkillDetail(pkg);
        setReviews(reviewsData.reviews || []);
      } catch (err) {
        console.error('Failed to fetch skill detail:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load skill details';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
      fetchDetail();
    }
  }, [packageId]);

  return { skillDetail, reviews, loading, error, refreshReviews };
}
