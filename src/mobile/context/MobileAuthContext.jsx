/**
 * Mobile Auth Context
 * Reads auth state from shared localStorage but isolated context
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserMe } from '../../services/api';

const MobileAuthContext = createContext(null);

export function MobileAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('shipper'); // driver, shipper, logist
  const [loading, setLoading] = useState(true);

  // Determine user role based on user data
  const determineRole = (userData) => {
    if (!userData) return 'shipper';

    // Check if user is admin
    if (userData.isAdmin) return 'admin';

    // Check if user is internal dispatcher
    if (userData.isInternalDispatcher) return 'logist';

    // Check activity type
    const activityType = userData.activityType?.toLowerCase() || '';
    if (activityType.includes('haydovchi') || activityType.includes('driver')) {
      return 'driver';
    }
    if (activityType.includes('logist')) {
      return 'logist';
    }

    return 'shipper';
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
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setIsAuthenticated(false);
      setUser(null);
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
    setUserRole('shipper');
  }, []);

  // Force set authenticated - called after successful login
  const setAuthenticated = useCallback((userData) => {
    setUser(userData);
    setUserRole(determineRole(userData));
    setIsAuthenticated(true);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const value = {
    isAuthenticated,
    user,
    userRole,
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
