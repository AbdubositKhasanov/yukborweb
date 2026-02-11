/**
 * Mobile Loading States
 * Spinner and skeleton components
 */
import React from 'react';

export default function MobileLoading({ fullScreen = false, text = '' }) {
  if (fullScreen) {
    return (
      <div
        className="m-app"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div className="m-loading">
          <div className="m-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="m-loading">
      <div className="m-spinner" />
      {text && <span style={{ marginLeft: 12, color: 'var(--m-text-muted)' }}>{text}</span>}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="m-skeleton m-skeleton-card" />
      ))}
    </>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="m-card m-card-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="m-list-item" style={{ pointerEvents: 'none' }}>
          <div className="m-skeleton" style={{ width: 10, height: 10, borderRadius: '50%' }} />
          <div className="m-list-item-content">
            <div className="m-skeleton" style={{ height: 16, width: '60%', marginBottom: 6 }} />
            <div className="m-skeleton" style={{ height: 14, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
