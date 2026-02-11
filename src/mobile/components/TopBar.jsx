/**
 * Top Bar Component
 * Contextual navigation header
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar({
  title,
  showBack = false,
  onBack,
  rightAction,
  rightIcon,
  onRightAction,
  transparent = false,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="m-topbar" style={transparent ? { background: 'transparent', borderBottom: 'none' } : {}}>
      {showBack ? (
        <button className="m-topbar-back" onClick={handleBack} aria-label="Orqaga">
          ←
        </button>
      ) : (
        <div style={{ width: 48 }} />
      )}

      <h1 className="m-topbar-title">{title}</h1>

      {rightAction || rightIcon ? (
        <button className="m-topbar-action" onClick={onRightAction} aria-label={rightAction}>
          {rightIcon || rightAction}
        </button>
      ) : (
        <div style={{ width: 48 }} />
      )}
    </header>
  );
}
