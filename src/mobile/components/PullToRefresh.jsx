/**
 * Pull to Refresh wrapper component
 * Touch gesture based refresh
 */
import React, { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 60;
  const MAX_PULL = 100;

  const handleTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;
    if (window.scrollY > 0) return;

    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || disabled || refreshing) return;
    if (window.scrollY > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.4, MAX_PULL);
      setPullDistance(distance);
    }
  }, [disabled, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) return;

    isPulling.current = false;

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [pullDistance, onRefresh, disabled]);

  const showIndicator = pullDistance > 0 || refreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100%' }}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: refreshing ? 50 : pullDistance,
          overflow: 'hidden',
          transition: isPulling.current ? 'none' : 'height 0.2s ease',
        }}>
          {refreshing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="m-spinner" style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 13, color: 'var(--m-text-muted)' }}>Yangilanmoqda...</span>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--m-text-muted)' }}>
              {pullDistance >= THRESHOLD ? '↑ Qo\'yib yuboring' : '↓ Yangilash uchun torting'}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
