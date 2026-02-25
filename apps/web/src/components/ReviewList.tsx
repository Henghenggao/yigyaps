import type { SkillPackageReview } from '@yigyaps/types';

interface ReviewListProps {
  reviews: SkillPackageReview[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ReviewList({ reviews, onLoadMore, hasMore = false }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="no-reviews">
        <p>No reviews yet. Be the first to review this skill!</p>
      </div>
    );
  }

  return (
    <div className="review-list">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {hasMore && onLoadMore && (
        <button className="btn btn-outline load-more-btn" onClick={onLoadMore}>
          Load More Reviews
        </button>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: SkillPackageReview }) {
  const timeAgo = getTimeAgo(new Date(review.createdAt));

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-rating">
          {renderStars(review.rating)}
          {review.title && <span className="review-title">{review.title}</span>}
        </div>
        <div className="review-meta">
          <span className="review-author">@{String((review as unknown as Record<string, unknown>).reviewerUsername)}</span>
          <span className="meta-separator">·</span>
          <span className="review-time">{timeAgo}</span>
          {review.verified && (
            <>
              <span className="meta-separator">·</span>
              <span className="verified-badge">Verified</span>
            </>
          )}
        </div>
      </div>
      {review.comment && <p className="review-comment">{review.comment}</p>}
    </div>
  );
}

// Helper: Render star rating (★★★★★)
function renderStars(rating: number) {
  return (
    <span className="star-rating">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'star-filled' : 'star-empty'}>
          {i < rating ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

// Helper: Format relative time ("2 days ago")
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString();
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}
