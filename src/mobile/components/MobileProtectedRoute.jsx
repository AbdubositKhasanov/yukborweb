/**
 * Mobile Protected Route
 * Redirects to login if not authenticated
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMobileAuth } from '../context/MobileAuthContext';
import MobileLoading from './MobileLoading';

export default function MobileProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useMobileAuth();
  const location = useLocation();

  if (loading) {
    return <MobileLoading fullScreen />;
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/mobile/login" state={{ from: location }} replace />;
  }

  return children;
}
