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

// Role-based default page redirect
function RoleBasedHome() {
  const { isAuthenticated, userRole } = useMobileAuth();

  console.log('[RoleBasedHome] isAuthenticated:', isAuthenticated, 'userRole:', userRole);

  // Redirect based on role - MUST match Desktop behavior
  if (isAuthenticated) {
    if (userRole === 'driver') {
      console.log('[RoleBasedHome] Redirecting driver to /mobile/status');
      return <Navigate to="/mobile/status" replace />;
    }
    if (userRole === 'factory') {
      console.log('[RoleBasedHome] Redirecting factory to /mobile/orders');
      return <Navigate to="/mobile/orders" replace />;
    }
  }

  // Default: show Yuklar (MobileHome)
  return <MobileHome />;
}

function MobileAppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useMobileAuth();

  // Reset scroll position when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Handle Android back button — only prevent app exit at root mobile pages
  useEffect(() => {
    const isRootPage = () => {
      const path = location.pathname.replace(/\/$/, '');
      const rootPages = ['/mobile', '/mobile/status', '/mobile/orders'];
      return rootPages.includes(path);
    };

    const handlePopState = (e) => {
      // Skip if a BottomSheet handled this popstate
      if (e.state?.bottomSheet) return;

      if (isRootPage()) {
        // At root — push state back to prevent browser from exiting the app
        window.history.pushState({ mobileRoot: true }, '', window.location.href);
      }
    };

    // Only push a guard state at root pages
    if (isRootPage()) {
      window.history.pushState({ mobileRoot: true }, '', window.location.href);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname]);

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
          <Route path="/yuklar" element={<MobileHome />} /> {/* Direct access to Yuklar */}
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
