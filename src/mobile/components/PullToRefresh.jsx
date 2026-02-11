/**
 * Pull to Refresh - simplified version
 * Shows refresh button + handles pull gesture on mobile
 */
import React, { useState } from 'react';

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (disabled || refreshing || !onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      {/* Refresh button at top */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 0',
        background: 'var(--m-bg)',
      }}>
        <button
          onClick={handleRefresh}
          disabled={disabled || refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            fontSize: 13,
            color: refreshing ? 'var(--m-text-muted)' : 'var(--m-primary)',
            background: 'var(--m-bg-card)',
            border: '1px solid var(--m-border)',
            borderRadius: 20,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {refreshing ? (
            <>
              <span className="m-spinner" style={{ width: 16, height: 16 }} />
              Yangilanmoqda...
            </>
          ) : (
            <>
              🔄 Yangilash
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {children}
    </>
  );
}
