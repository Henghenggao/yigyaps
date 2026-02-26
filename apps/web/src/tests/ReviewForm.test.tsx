/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewForm } from "../components/ReviewForm";
import { useAuth } from "../contexts/AuthContext";
import type { User, AuthContextType } from "../contexts/AuthContext";
import type { SkillPackage } from "@yigyaps/types";
import * as api from "../lib/api";

// Mock Auth
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock API
vi.mock("../lib/api", () => ({
  fetchApi: vi.fn(),
}));

describe("ReviewForm", () => {
  const mockOnSubmitted = vi.fn();
  const mockSkill = {
    packageId: "test-package-123",
    version: "1.0.0",
    displayName: "Test Skill",
  } as unknown as SkillPackage;

  const mockUser = { id: "user-1" } as unknown as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign in message when not logged in", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as unknown as AuthContextType);
    render(
      <ReviewForm skill={mockSkill} onReviewSubmitted={mockOnSubmitted} />,
    );
    expect(screen.getByText(/Sign in to write a review/i)).toBeInTheDocument();
  });

  it("renders form fields when logged in", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
    } as unknown as AuthContextType);
    render(
      <ReviewForm skill={mockSkill} onReviewSubmitted={mockOnSubmitted} />,
    );

    expect(screen.getByText(/Write a Review/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Share your experience/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Submit Review/i)).toBeInTheDocument();
  });

  it("submits form with valid data", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
    } as unknown as AuthContextType);
    vi.mocked(api.fetchApi).mockResolvedValueOnce({});

    render(
      <ReviewForm skill={mockSkill} onReviewSubmitted={mockOnSubmitted} />,
    );

    // Fill in title (Sum up your experience)
    const titleInput = screen.getByPlaceholderText(/Sum up your experience/i);
    fireEvent.change(titleInput, { target: { value: "Great skill!" } });

    // Fill in comment (Share your experience)
    const commentInput = screen.getByPlaceholderText(/Share your experience/i);
    fireEvent.change(commentInput, {
      target: { value: "Works perfectly and very easy to use!" },
    });

    // Submit
    const submitButton = screen.getByText(/Submit Review/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.fetchApi).toHaveBeenCalledWith(
        "/v1/reviews",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"rating":5'),
        }),
      );
      expect(mockOnSubmitted).toHaveBeenCalled();
    });
  });

  it("validates minimum comment length", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
    } as unknown as AuthContextType);
    render(
      <ReviewForm skill={mockSkill} onReviewSubmitted={mockOnSubmitted} />,
    );

    const commentInput = screen.getByPlaceholderText(/Share your experience/i);
    fireEvent.change(commentInput, { target: { value: "short" } });

    const submitButton = screen.getByText(/Submit Review/i);
    expect(submitButton).toBeDisabled();
  });
});
