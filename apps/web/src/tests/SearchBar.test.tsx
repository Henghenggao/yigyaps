/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "../components/SearchBar";

describe("SearchBar", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("renders input field with proper placeholder", () => {
    render(<SearchBar value="" onChange={mockOnChange} />);
    expect(
      screen.getByPlaceholderText(/Search skills.../i),
    ).toBeInTheDocument();
  });

  it("debounces onChange with 300ms delay", async () => {
    render(<SearchBar value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/Search skills.../i);
    fireEvent.change(input, { target: { value: "react" } });

    // Advance time
    vi.advanceTimersByTime(300);

    // Run any remaining microtasks/effects
    vi.runOnlyPendingTimers();

    expect(mockOnChange).toHaveBeenCalledWith("react");
  });

  it("shows and handles the clear button", async () => {
    render(<SearchBar value="something" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(
      /Search skills.../i,
    ) as HTMLInputElement;
    expect(input.value).toBe("something");

    const clearBtn = screen.getByLabelText(/Clear search/i);
    fireEvent.click(clearBtn);

    expect(input.value).toBe("");
    expect(mockOnChange).toHaveBeenCalledWith("");
  });
});
