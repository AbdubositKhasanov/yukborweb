/**
 * Load More Trigger component
 * Uses Intersection Observer for infinite scroll
 */
import React, { useEffect, useRef } from 'react';

export default function LoadMoreTrigger({ onLoadMore, hasMore, loading }) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const current = triggerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [onLoadMore, hasMore, loading]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className="m-load-more">
      {loading && (
        <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
          <div className="m-spinner" style={{ width: 24, height: 24 }} />
        </div>
      )}
    </div>
  );
}
