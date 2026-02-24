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
  const closedByBackRef = useRef(false);
  const historyPushedRef = useRef(false);

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

  // Android back button support — close sheet on back instead of navigating
  useEffect(() => {
    if (!isOpen) {
      // When sheet closes NOT via back button, pop the extra history entry
      if (historyPushedRef.current && !closedByBackRef.current) {
        window.history.back();
      }
      historyPushedRef.current = false;
      closedByBackRef.current = false;
      return;
    }

    // Sheet opened — push a history entry so Android back triggers popstate
    closedByBackRef.current = false;
    window.history.pushState({ bottomSheet: true }, '');
    historyPushedRef.current = true;

    const handlePopState = () => {
      closedByBackRef.current = true;
      historyPushedRef.current = false;
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
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
