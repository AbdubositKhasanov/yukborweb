/**
 * Mobile Auth Context
 * Reads auth state from shared localStorage but isolated context
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserMe } from '../../services/api';
import { trackLogout, setAnalyticsUserProperties } from '../../services/analytics';

const MobileAuthContext = createContext(null);

export function MobileAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('logist'); // driver, factory, logist
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine user role based on user data
  // Roles: driver, factory, logist (default)
  // isInternalDispatcher gives extra permissions to logist
  const determineRole = (userData) => {
    if (!userData) return 'logist';

    const userType = userData.type?.toLowerCase() || '';

    console.log('[MobileAuth] User type from API:', userData.type, '-> normalized:', userType);

    if (userType === 'driver' || userType === 'haydovchi') {
      console.log('[MobileAuth] Role determined: driver');
      return 'driver';
    }
    if (userType === 'factory' || userType === 'zavod') {
      console.log('[MobileAuth] Role determined: factory');
      return 'factory';
    }

    // Default to logist for all other types (including 'logist', 'not_selected', etc.)
    console.log('[MobileAuth] Role determined: logist (default)');
    return 'logist';
  };

  // Load user data
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setUser(response.result);
        setUserRole(determineRole(response.result));
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
        setIsAuthenticated(true);
        setAnalyticsUserProperties(
          response.result.chatId,
          determineRole(response.result),
          response.result.isInternalDispatcher
        );
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsInternalDispatcher(false);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setIsAuthenticated(false);
      setUser(null);
      setIsInternalDispatcher(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for auth changes (login/logout from desktop)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'authToken') {
        loadUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUser]);

  const logout = useCallback(() => {
    trackLogout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
    setUserRole('logist');
    setIsInternalDispatcher(false);
  }, []);

  // Force set authenticated - called after successful login
  const setAuthenticated = useCallback((userData) => {
    setUser(userData);
    setUserRole(determineRole(userData));
    setIsInternalDispatcher(userData?.isInternalDispatcher === true);
    setIsAuthenticated(true);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const value = {
    isAuthenticated,
    user,
    userRole,
    isInternalDispatcher,
    loading,
    logout,
    refreshUser,
    setAuthenticated,
  };

  return (
    <MobileAuthContext.Provider value={value}>
      {children}
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth() {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within MobileAuthProvider');
  }
  return context;
}
