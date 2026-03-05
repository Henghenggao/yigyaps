import type { ReactNode } from "react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages: ReactNode[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Adjust if we're at the beginning or end
    if (currentPage <= 3) {
      endPage = Math.min(maxPagesToShow, totalPages);
    }
    if (currentPage >= totalPages - 2) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${i === currentPage ? "active" : ""}`}
          aria-current={i === currentPage ? "page" : undefined}
          aria-label={`Page ${i}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>,
      );
    }

    return pages;
  };

  return (
    <nav className="pagination" aria-label="Pagination Navigation">
      <div className="pagination-info" aria-live="polite">
        Showing {startItem}-{endItem} of {totalItems} results
      </div>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={handlePrevious}
          aria-label="Previous page"
          disabled={currentPage === 1}
        >
          ← Prev
        </button>
        {renderPageNumbers()}
        <button
          className="pagination-btn"
          onClick={handleNext}
          aria-label="Next page"
          disabled={currentPage === totalPages}
        >
          Next →
        </button>
      </div>
    </nav>
  );
}
