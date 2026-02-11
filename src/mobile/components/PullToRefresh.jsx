/**
 * Pull to Refresh wrapper component
 * Adds pull-to-refresh functionality to any scrollable content
 */
import React, { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const THRESHOLD = 80; // Pull distance to trigger refresh
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || disabled || refreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPulling(false);
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Prevent default scroll when pulling down
      e.preventDefault();
      // Apply resistance for natural feel
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
    }
  }, [pulling, disabled, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling || disabled) return;

    setPulling(false);

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [pulling, pullDistance, onRefresh, disabled]);

  const showIndicator = pullDistance > 0 || refreshing;
  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="m-ptr-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull indicator */}
      <div
        className="m-ptr-indicator"
        style={{
          height: showIndicator ? Math.max(pullDistance, refreshing ? 50 : 0) : 0,
          opacity: showIndicator ? 1 : 0,
          transition: pulling ? 'none' : 'all 0.3s ease',
        }}
      >
        {refreshing ? (
          <div className="m-ptr-spinner">
            <div className="m-spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <div
            className="m-ptr-arrow"
            style={{
              transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              opacity: progress,
            }}
          >
            {progress >= 1 ? '↑ Qo\'yib yuboring' : '↓ Yangilash uchun torting'}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
