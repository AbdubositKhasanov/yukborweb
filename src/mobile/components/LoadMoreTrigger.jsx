/**
 * Load More Trigger component
 * Detects when user scrolls near bottom and triggers load more
 */
import React, { useEffect, useRef, useCallback } from 'react';

export default function LoadMoreTrigger({ onLoadMore, hasMore, loading }) {
  const triggerRef = useRef(null);
  const loadingRef = useRef(false);

  // Update loading ref to prevent multiple calls
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const checkAndLoad = useCallback(() => {
    if (!hasMore || loadingRef.current) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // If trigger element is visible (within 200px of viewport bottom)
    if (rect.top < windowHeight + 200) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  useEffect(() => {
    if (!hasMore) return;

    // Check on scroll
    const handleScroll = () => {
      checkAndLoad();
    };

    // Listen to window scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also check immediately in case content is short
    const timeout = setTimeout(checkAndLoad, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [hasMore, checkAndLoad]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} style={{ padding: 16, textAlign: 'center' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <span className="m-spinner" style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 14, color: 'var(--m-text-muted)' }}>Yuklanmoqda...</span>
        </div>
      ) : (
        <button
          onClick={onLoadMore}
          style={{
            padding: '8px 24px',
            fontSize: 14,
            color: 'var(--m-primary)',
            background: 'transparent',
            border: '1px solid var(--m-primary)',
            borderRadius: 20,
            cursor: 'pointer',
          }}
        >
          Ko'proq yuklash
        </button>
      )}
    </div>
  );
}
