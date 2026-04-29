import React from 'react';

export default function CargoOwnerToggle({ checked, onChange, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Faqat yuk egasi buyurtmalarini ko'rsatish (logistlar yashiriladi)"
      onClick={() => onChange(!checked)}
      className={`cargo-owner-toggle ${checked ? 'is-active' : ''} ${className}`.trim()}
    >
      <span className="cargo-owner-toggle__indicator" aria-hidden="true">
        {checked ? (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M6.173 12.414L1.586 7.828a1 1 0 0 1 1.414-1.414l3.173 3.172 6.827-6.827a1 1 0 0 1 1.414 1.414L6.173 12.414z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
          </svg>
        )}
      </span>
      <span className="cargo-owner-toggle__label">Faqat yuk egasi</span>
    </button>
  );
}
