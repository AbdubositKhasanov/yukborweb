/**
 * Mobile Protected Route
 * Redirects to mini app root if auth or role is not ready
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMobileAuth } from '../context/MobileAuthContext';
import MobileLoading from './MobileLoading';

export default function MobileProtectedRoute({ children }) {
  const { isAuthenticated, loading, needsRoleSelection } = useMobileAuth();

  if (loading) {
    return <MobileLoading fullScreen />;
  }

  if (!isAuthenticated || needsRoleSelection) {
    return <Navigate to="/mobile" replace />;
  }

  return children;
}
