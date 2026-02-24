/**
 * Bottom Sheet Component
 * Mobile-native modal pattern with Android back button support
 */
import React, { useEffect, useRef } from 'react';

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  height = 'auto', // 'auto', 'half', 'full'
}) {
  const sheetRef = useRef(null);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getHeightStyle = () => {
    switch (height) {
      case 'full':
        return { maxHeight: '90vh', height: '90vh' };
      case 'half':
        return { maxHeight: '50vh', height: '50vh' };
      default:
        return { maxHeight: '90vh' };
    }
  };

  return (
    <>
      <div
        className={`m-sheet-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />
      <div
        ref={sheetRef}
        className={`m-sheet ${isOpen ? 'open' : ''}`}
        style={getHeightStyle()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="m-sheet-handle" />

        {title && (
          <div className="m-sheet-header">
            <h2 className="m-sheet-title">{title}</h2>
            <button className="m-sheet-close" onClick={onClose} aria-label="Yopish">
              ✕
            </button>
          </div>
        )}

        <div className="m-sheet-content">{children}</div>

        {footer && <div className="m-sheet-footer">{footer}</div>}
      </div>
    </>
  );
}
