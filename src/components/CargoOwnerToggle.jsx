import React from 'react';

export default function CargoOwnerToggle({
  checked,
  onChange,
  value,
  onValueChange,
  className = '',
}) {
  const isActive = value ? value === 'cargo_owner_only' : checked !== false;

  const handleClick = () => {
    const nextValue = isActive ? 'all' : 'cargo_owner_only';
    onValueChange?.(nextValue);
    onChange?.(nextValue === 'cargo_owner_only');
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label="Faqat yuk egasi buyurtmalarini ko'rsatish"
      onClick={handleClick}
      className={`cargo-owner-toggle ${isActive ? 'is-active' : ''} ${className}`.trim()}
    >
      <span className="cargo-owner-toggle__indicator" aria-hidden="true">
        {isActive ? '✓' : ''}
      </span>
      <span className="cargo-owner-toggle__label">Yuk egasi</span>
    </button>
  );
}
