/** @vitest-environment jsdom */
import "./setup";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

const ThrowError = () => {
  throw new Error("Test error thrown!");
};

describe("ErrorBoundary", () => {
  it("should catch errors in children and display fallback UI", () => {
    // Temporarily silence console.error for the expected error
    const originalError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    console.error = originalError;

    expect(screen.getByText("Something went wrong.")).toBeTruthy();
    expect(screen.getByText("Test error thrown!")).toBeTruthy();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeTruthy();
  });

  it("should render children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div data-testid="success">All good here!</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("success")).toBeTruthy();
    expect(screen.getByText("All good here!")).toBeTruthy();
    expect(screen.queryByText("Something went wrong.")).toBeNull();
  });
});
