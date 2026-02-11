/**
 * Snackbar Component
 * Mobile-friendly toast replacement
 */
import React, { useEffect, useState, useCallback } from 'react';

// Global snackbar state
let showSnackbar = () => {};

export function useSnackbar() {
  return { show: showSnackbar };
}

export function SnackbarProvider({ children }) {
  const [snackbar, setSnackbar] = useState(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((message, options = {}) => {
    const { type = 'default', action, onAction, duration = 4000 } = options;

    setSnackbar({ message, type, action, onAction });
    setVisible(true);

    // Auto-hide after duration
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setSnackbar(null), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    showSnackbar = show;
  }, [show]);

  const handleAction = () => {
    if (snackbar?.onAction) {
      snackbar.onAction();
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <>
      {children}
      {snackbar && (
        <div
          className={`m-snackbar ${visible ? 'show' : ''} ${snackbar.type}`}
          role="alert"
          onClick={handleDismiss}
        >
          <span className="m-snackbar-message">{snackbar.message}</span>
          {snackbar.action && (
            <button className="m-snackbar-action" onClick={handleAction}>
              {snackbar.action}
            </button>
          )}
        </div>
      )}
    </>
  );
}

// Shorthand functions
export const showSuccess = (message, options = {}) => {
  showSnackbar(message, { ...options, type: 'success' });
};

export const showError = (message, options = {}) => {
  showSnackbar(message, { ...options, type: 'error' });
};

export const showInfo = (message, options = {}) => {
  showSnackbar(message, { ...options, type: 'default' });
};
