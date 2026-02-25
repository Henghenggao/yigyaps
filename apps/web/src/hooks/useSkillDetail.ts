import { useState, useEffect } from 'react';
import { YigYapsRegistryClient } from '@yigyaps/client';
import type { SkillPackage, SkillPackageReview } from '@yigyaps/types';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export function useSkillDetail(packageId: string) {
  const [skillDetail, setSkillDetail] = useState<SkillPackage | null>(null);
  const [reviews, setReviews] = useState<SkillPackageReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReviews = async () => {
    try {
      const response = await fetch(`${baseUrl}/v1/reviews/${packageId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data = await response.json();
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

        const client = new YigYapsRegistryClient({ baseUrl });

        // Parallel fetch for better performance
        const [pkg, reviewsResponse] = await Promise.all([
          client.getByPackageId(packageId),
          fetch(`${baseUrl}/v1/reviews/${packageId}`),
        ]);

        if (!reviewsResponse.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const reviewsData = await reviewsResponse.json();

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
