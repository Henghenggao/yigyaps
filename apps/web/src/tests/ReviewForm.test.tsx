import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewForm } from '../components/ReviewForm';

describe('ReviewForm', () => {
  const mockOnSubmit = vi.fn();
  const mockPackageId = 'test-package-123';

  it('renders form fields', () => {
    render(<ReviewForm packageId={mockPackageId} onReviewSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/rating/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/comment/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Review/i)).toBeInTheDocument();
  });

  it('validates required rating field', async () => {
    render(<ReviewForm packageId={mockPackageId} onReviewSubmit={mockOnSubmit} />);

    const submitButton = screen.getByText(/Submit Review/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits form with valid data', async () => {
    render(<ReviewForm packageId={mockPackageId} onReviewSubmit={mockOnSubmit} />);

    // Select rating (adjust selector based on actual implementation)
    const ratingInput = screen.getByLabelText(/rating/i);
    fireEvent.change(ratingInput, { target: { value: '5' } });

    // Fill in optional fields
    const titleInput = screen.getByPlaceholderText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Great skill!' } });

    const commentInput = screen.getByPlaceholderText(/comment/i);
    fireEvent.change(commentInput, { target: { value: 'Works perfectly!' } });

    // Submit
    const submitButton = screen.getByText(/Submit Review/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: expect.any(Number),
          title: 'Great skill!',
          comment: 'Works perfectly!',
        })
      );
    });
  });

  it('limits comment length', () => {
    render(<ReviewForm packageId={mockPackageId} onReviewSubmit={mockOnSubmit} />);

    const commentInput = screen.getByPlaceholderText(/comment/i) as HTMLTextAreaElement;
    const longComment = 'a'.repeat(2000);
    fireEvent.change(commentInput, { target: { value: longComment } });

    // Check if maxLength attribute is set
    expect(commentInput.maxLength).toBeLessThanOrEqual(1000);
  });

  it('disables submit button during submission', async () => {
    const slowSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    render(<ReviewForm packageId={mockPackageId} onReviewSubmit={slowSubmit} />);

    const ratingInput = screen.getByLabelText(/rating/i);
    fireEvent.change(ratingInput, { target: { value: '4' } });

    const submitButton = screen.getByText(/Submit Review/i);
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
