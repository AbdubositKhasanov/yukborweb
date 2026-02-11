/**
 * Pagination component with page number buttons
 * Shows: < 1 2 3 4 5 >
 */
import React from 'react';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false
}) {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers (show max 5 pages)
  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages - 1, start + 4);

    // Adjust start if we're near the end
    if (end - start < 4) {
      start = Math.max(0, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  const buttonStyle = {
    minWidth: 36,
    height: 36,
    padding: '0 8px',
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid var(--m-border)',
    borderRadius: 8,
    background: 'var(--m-card-bg)',
    color: 'var(--m-text)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: 'var(--m-primary)',
    color: '#fff',
    borderColor: 'var(--m-primary)',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      padding: '16px 12px',
      flexWrap: 'wrap',
    }}>
      {/* Previous button */}
      <button
        onClick={() => !loading && currentPage > 0 && onPageChange(currentPage - 1)}
        style={currentPage === 0 || loading ? disabledButtonStyle : buttonStyle}
        disabled={currentPage === 0 || loading}
      >
        ←
      </button>

      {/* First page + ellipsis if needed */}
      {visiblePages[0] > 0 && (
        <>
          <button
            onClick={() => !loading && onPageChange(0)}
            style={currentPage === 0 ? activeButtonStyle : buttonStyle}
            disabled={loading}
          >
            1
          </button>
          {visiblePages[0] > 1 && (
            <span style={{ color: 'var(--m-text-muted)', padding: '0 4px' }}>...</span>
          )}
        </>
      )}

      {/* Visible page numbers */}
      {visiblePages.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => !loading && onPageChange(pageNum)}
          style={currentPage === pageNum ? activeButtonStyle : buttonStyle}
          disabled={loading}
        >
          {pageNum + 1}
        </button>
      ))}

      {/* Last page + ellipsis if needed */}
      {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 2 && (
            <span style={{ color: 'var(--m-text-muted)', padding: '0 4px' }}>...</span>
          )}
          <button
            onClick={() => !loading && onPageChange(totalPages - 1)}
            style={currentPage === totalPages - 1 ? activeButtonStyle : buttonStyle}
            disabled={loading}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next button */}
      <button
        onClick={() => !loading && currentPage < totalPages - 1 && onPageChange(currentPage + 1)}
        style={currentPage >= totalPages - 1 || loading ? disabledButtonStyle : buttonStyle}
        disabled={currentPage >= totalPages - 1 || loading}
      >
        →
      </button>

      {/* Loading indicator */}
      {loading && (
        <span className="m-spinner" style={{ width: 20, height: 20, marginLeft: 8 }} />
      )}
    </div>
  );
}
