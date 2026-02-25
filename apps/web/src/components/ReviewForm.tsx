import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { SkillPackage } from '@yigyaps/types';

interface ReviewFormProps {
  skill: SkillPackage;
  onReviewSubmitted: () => void;
}

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export function ReviewForm({ skill, onReviewSubmitted }: ReviewFormProps) {
  const { user, token } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!user) {
    return (
      <div className="review-form-placeholder">
        <p>Sign in to write a review</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Comment must be at least 10 characters');
      return;
    }

    if (comment.length > 1000) {
      setError('Comment must not exceed 1000 characters');
      return;
    }

    if (title.length > 100) {
      setError('Title must not exceed 100 characters');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${baseUrl}/v1/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId: skill.packageId,
          packageVersion: skill.version,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit review');
      }

      // Success
      setSuccess(true);
      setRating(5);
      setTitle('');
      setComment('');
      onReviewSubmitted();

      // Clear success message after 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to submit review:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3 className="review-form-title">Write a Review</h3>

      {/* Star Rating Selector */}
      <div className="form-group">
        <label className="form-label">
          Rating <span className="required">*</span>
        </label>
        <div className="star-selector">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= (hoveredRating || rating) ? 'active' : ''}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
            >
              ★
            </button>
          ))}
          <span className="star-label">{rating} star{rating > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Title (Optional) */}
      <div className="form-group">
        <label htmlFor="review-title" className="form-label">
          Title <span className="optional">(optional)</span>
        </label>
        <input
          id="review-title"
          type="text"
          className="form-input"
          placeholder="Sum up your experience"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          disabled={submitting}
        />
        <div className="char-count">{title.length}/100</div>
      </div>

      {/* Comment (Required) */}
      <div className="form-group">
        <label htmlFor="review-comment" className="form-label">
          Review <span className="required">*</span>
        </label>
        <textarea
          id="review-comment"
          className="form-textarea"
          placeholder="Share your experience with this skill (minimum 10 characters)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={5}
          required
          disabled={submitting}
        />
        <div className="char-count">{comment.length}/1000</div>
      </div>

      {/* Error Message */}
      {error && <div className="form-error">{error}</div>}

      {/* Success Message */}
      {success && <div className="form-success">Review submitted successfully!</div>}

      {/* Submit Button */}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || comment.trim().length < 10}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
