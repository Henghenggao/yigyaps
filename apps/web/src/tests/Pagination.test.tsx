/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../components/Pagination';

describe('Pagination', () => {
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('renders current page info', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText(/Showing 1-10 of 50 results/i)).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    const prevButton = screen.getByText(/Prev/i);
    expect(prevButton).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByText(/Next/i);
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange with correct page number on Next click', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with correct page number on Previous click', () => {
    render(
      <Pagination
        currentPage={3}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    const prevButton = screen.getByText(/Prev/i);
    fireEvent.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('handles single page correctly', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={10}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    const prevButton = screen.getByText(/Prev/i);
    const nextButton = screen.getByText(/Next/i);

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('does not render when totalItems is 0', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalItems={0}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders page numbers for small page counts', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );

    // Check if individual page numbers are rendered (1, 2, 3, 4, 5)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
