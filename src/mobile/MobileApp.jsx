/**
 * Mobile App Entry Point
 * Isolated mobile-only UI layer
 * Route: /mobile/*
 */
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MobileProtectedRoute from './components/MobileProtectedRoute';
import MobileLoading from './components/MobileLoading';
import { MobileAuthProvider, useMobileAuth } from './context/MobileAuthContext';
import { trackPageView } from '../services/analytics';
import useTelegramBackButton from './hooks/useTelegramBackButton';
import './styles/mobile.css';

// Lazy load mobile pages
const MobileHome = lazy(() => import('./pages/MobileHome'));
const MobileLogin = lazy(() => import('./pages/MobileLogin'));
const MobileCargoDetail = lazy(() => import('./pages/MobileCargoDetail'));
const MobileTransportSearch = lazy(() => import('./pages/MobileTransportSearch'));
const MobileTransportDetail = lazy(() => import('./pages/MobileTransportDetail'));
const MobileCreateOrder = lazy(() => import('./pages/MobileCreateOrder'));
const MobileMyOrders = lazy(() => import('./pages/MobileMyOrders'));
const MobileOrderDetail = lazy(() => import('./pages/MobileOrderDetail'));
const MobileDriverStatus = lazy(() => import('./pages/MobileDriverStatus'));
const MobileMyDrivers = lazy(() => import('./pages/MobileMyDrivers'));
const MobileDriverDetail = lazy(() => import('./pages/MobileDriverDetail'));
const MobileProfile = lazy(() => import('./pages/MobileProfile'));
const MobileMyTransports = lazy(() => import('./pages/MobileMyTransports'));
const MobileCreateTransport = lazy(() => import('./pages/MobileCreateTransport'));
const MobileMyListings = lazy(() => import('./pages/MobileMyListings'));

// Admin pages (shared between desktop and mobile — responsive components)
const AdminUsersPage = lazy(() => import('../pages/AdminDriversPage'));
const AdminUserDetailPage = lazy(() => import('../pages/AdminDriverDetailPage'));

// Role-based default page redirect
function RoleBasedHome() {
  const { isAuthenticated, userRole, loading } = useMobileAuth();

  console.log('[RoleBasedHome] isAuthenticated:', isAuthenticated, 'userRole:', userRole);

  // Auth hali tekshirilayotgan bo'lsa — loader
  if (loading) return <MobileLoading fullScreen />;

  // Autentifikatsiya qilinmagan foydalanuvchi — login sahifasiga
  if (!isAuthenticated) {
    console.log('[RoleBasedHome] Not authenticated, redirecting to /mobile/login');
    return <Navigate to="/mobile/login" replace />;
  }

  // Redirect based on role - MUST match Desktop behavior
  if (userRole === 'driver') {
    console.log('[RoleBasedHome] Redirecting driver to /mobile/status');
    return <Navigate to="/mobile/status" replace />;
  }
  if (userRole === 'factory') {
    console.log('[RoleBasedHome] Redirecting factory to /mobile/orders');
    return <Navigate to="/mobile/orders" replace />;
  }

  // Logist yoki boshqa rollar: Yuklar (MobileHome)
  return <MobileHome />;
}

function MobileAppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useMobileAuth();

  // Telegram Mini App back button — navigate(-1) instead of closing app
  useTelegramBackButton();

  // Reset scroll position and track page view when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(location.pathname);
  }, [location.pathname]);

  // No history manipulation here — let React Router handle all navigation naturally.
  // Android hardware back button works with browser history by default.

  // Determine if bottom nav should be shown
  const showBottomNav = isAuthenticated && !location.pathname.includes('/login');

  // Determine active tab based on route and role
  const getActiveTab = () => {
    const path = location.pathname.replace('/mobile', '');

    // Role-specific tab detection
    // Roles: driver, factory, logist (default)
    if (userRole === 'driver') {
      if (path === '/status') return 'home';
      if (path === '/yuklar' || path.startsWith('/cargo')) return 'search';
      if (path.startsWith('/my-transports')) return 'orders';
      if (path.startsWith('/profile')) return 'profile';
    } else if (userRole === 'factory') {
      if (path.startsWith('/orders') || path.startsWith('/order/')) return 'home';
      if (path === '/yuklar' || path.startsWith('/cargo')) return 'search';
      if (path.startsWith('/create')) return 'add';
      if (path.startsWith('/transports') || path.startsWith('/transport/')) return 'transports';
      if (path.startsWith('/profile')) return 'profile';
    } else {
      // logist (default)
      if (path === '' || path === '/' || path === '/yuklar' || path.startsWith('/cargo')) return 'home';
      if (path.startsWith('/transports') || path.startsWith('/transport/')) return 'transports';
      if (path.startsWith('/drivers') || path.startsWith('/driver/')) return 'drivers';
      if (path.startsWith('/my-listings') || path.startsWith('/orders') || path.startsWith('/order/') || path.startsWith('/my-transports') || path.startsWith('/create')) return 'listings';
      if (path.startsWith('/profile')) return 'profile';
    }

    return 'home';
  };

  if (loading) {
    return <MobileLoading fullScreen />;
  }

  return (
    <div className="m-app">
      <Suspense fallback={<MobileLoading fullScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RoleBasedHome />} />
          <Route
            path="/yuklar"
            element={
              <MobileProtectedRoute>
                <MobileHome />
              </MobileProtectedRoute>
            }
          />
          <Route path="/login" element={<MobileLogin />} />
          <Route path="/cargo/:id" element={<MobileCargoDetail />} />

          {/* Protected Routes */}
          <Route
            path="/transports"
            element={
              <MobileProtectedRoute>
                <MobileTransportSearch />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/transport/:id"
            element={
              <MobileProtectedRoute>
                <MobileTransportDetail />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/create-order"
            element={
              <MobileProtectedRoute>
                <MobileCreateOrder />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <MobileProtectedRoute>
                <MobileMyOrders />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/order/:id"
            element={
              <MobileProtectedRoute>
                <MobileOrderDetail />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/status"
            element={
              <MobileProtectedRoute>
                <MobileDriverStatus />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/drivers"
            element={
              <MobileProtectedRoute>
                <MobileMyDrivers />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/driver/:id"
            element={
              <MobileProtectedRoute>
                <MobileDriverDetail />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/my-transports"
            element={
              <MobileProtectedRoute>
                <MobileMyTransports />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/create-transport"
            element={
              <MobileProtectedRoute>
                <MobileCreateTransport />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/my-listings"
            element={
              <MobileProtectedRoute>
                <MobileMyListings />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <MobileProtectedRoute>
                <MobileProfile />
              </MobileProtectedRoute>
            }
          />

          {/* Admin Routes (mobile-responsive desktop pages) */}
          <Route
            path="/admin/users"
            element={
              <MobileProtectedRoute>
                <AdminUsersPage defaultRole="any" mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/drivers"
            element={
              <MobileProtectedRoute>
                <AdminUsersPage defaultRole="driver" mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <MobileProtectedRoute>
                <AdminUserDetailPage mobile />
              </MobileProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/mobile" replace />} />
        </Routes>
      </Suspense>

      {showBottomNav && (
        <BottomNav
          key={userRole}
          activeTab={getActiveTab()}
          userRole={userRole}
        />
      )}
    </div>
  );
}

export default function MobileApp() {
  return (
    <MobileAuthProvider>
      <MobileAppContent />
    </MobileAuthProvider>
  );
}
