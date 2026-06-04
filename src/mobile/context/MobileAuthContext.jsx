/**
 * Mobile Auth Context
 * Reads mobile auth from Telegram Mini App initData and shared localStorage.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUserMe, loginTelegramMiniApp } from '../../services/api';
import { trackLogout, setAnalyticsUserProperties } from '../../services/analytics';

const MobileAuthContext = createContext(null);
const MOBILE_AUTH_CLEARED_EVENT = 'mobile-auth-token-cleared';

const getTelegramWebApp = () => {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
};

const getTelegramInitData = () => getTelegramWebApp()?.initData || '';
const getTelegramUser = () => getTelegramWebApp()?.initDataUnsafe?.user || null;

const determineRole = (userData) => {
  if (!userData) return 'not_selected';

  const userType = userData.type?.toLowerCase()?.trim() || '';

  console.log('[MobileAuth] User type from API:', userData.type, '-> normalized:', userType);

  if (!userType || userType === 'not_selected') {
    console.log('[MobileAuth] Role not selected yet');
    return 'not_selected';
  }
  if (userType === 'driver' || userType === 'haydovchi') {
    console.log('[MobileAuth] Role determined: driver');
    return 'driver';
  }
  if (userType === 'factory' || userType === 'zavod' || userType === 'client' || userType === 'cargo_owner') {
    console.log('[MobileAuth] Role determined: factory');
    return 'factory';
  }
  if (userType === 'logist' || userType === 'logistic' || userType === 'dispatcher') {
    console.log('[MobileAuth] Role determined: logist');
    return 'logist';
  }

  console.warn('[MobileAuth] Unknown role, asking user to select:', userType);
  return 'not_selected';
};

export function MobileAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [userRole, setUserRole] = useState('not_selected'); // not_selected, driver, factory, logist
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const loadingRef = useRef(false);

  const clearUserState = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setUserRole('not_selected');
    setIsInternalDispatcher(false);
    setPermissions(null);
  }, []);

  const applyUserState = useCallback((userData) => {
    const role = determineRole(userData);
    setUser(userData);
    setUserRole(role);
    setTelegramUser(getTelegramUser());
    setIsInternalDispatcher(userData?.isInternalDispatcher === true);
    setPermissions(userData?.permissions || null);
    setIsAuthenticated(true);
    setAuthError('');
    setAnalyticsUserProperties(
      userData?.chatId,
      role,
      userData?.isInternalDispatcher
    );
  }, []);

  const authenticateWithTelegram = useCallback(async () => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
    setTelegramUser(getTelegramUser());

    const initData = getTelegramInitData();
    if (!initData) {
      setAuthError('Mini app Telegram ichida ochilishi kerak');
      clearUserState();
      return false;
    }

    const response = await loginTelegramMiniApp(initData);
    if (response.code === 200 && response.result) {
      applyUserState(response.result);
      return true;
    }

    setAuthError(response.message || 'Telegram orqali kirishda xatolik yuz berdi');
    clearUserState();
    return false;
  }, [applyUserState, clearUserState]);

  // Load user data
  const loadUser = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const token = localStorage.getItem('authToken');

    try {
      if (getTelegramInitData()) {
        await authenticateWithTelegram();
        return;
      }

      if (token) {
        const response = await getUserMe();
        if (response.code === 200 && response.result) {
          applyUserState(response.result);
          return;
        }
      }

      await authenticateWithTelegram();
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');

      try {
        await authenticateWithTelegram();
      } catch (telegramError) {
        console.error('Failed to authenticate Telegram Mini App:', telegramError);
        setAuthError('Telegram orqali kirishda xatolik yuz berdi');
        clearUserState();
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [applyUserState, authenticateWithTelegram, clearUserState]);

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
    const handleTokenCleared = () => loadUser();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(MOBILE_AUTH_CLEARED_EVENT, handleTokenCleared);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(MOBILE_AUTH_CLEARED_EVENT, handleTokenCleared);
    };
  }, [loadUser]);

  const logout = useCallback(() => {
    trackLogout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    clearUserState();
  }, [clearUserState]);

  // Force set authenticated - called after successful login
  const setAuthenticated = useCallback((userData) => {
    applyUserState(userData);
  }, [applyUserState]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const value = {
    isAuthenticated,
    user,
    telegramUser,
    userRole,
    needsRoleSelection: isAuthenticated && userRole === 'not_selected',
    isInternalDispatcher,
    permissions,
    loading,
    authError,
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
