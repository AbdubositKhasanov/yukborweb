/**
 * Mobile App Entry Point
 * Isolated mobile-only UI layer
 * Route: /mobile/*
 */
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MobileProtectedRoute from './components/MobileProtectedRoute';
import MobileLoading from './components/MobileLoading';
import { MobileAuthProvider, useMobileAuth } from './context/MobileAuthContext';
import MobileRoleSelect from './pages/MobileRoleSelect';
import { trackPageView } from '../services/analytics';
import useTelegramBackButton from './hooks/useTelegramBackButton';
import './styles/mobile.css';

// Lazy load mobile pages
const MobileHome = lazy(() => import('./pages/MobileHome'));
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
const TariffsPage = lazy(() => import('../pages/TariffsPage'));

// Admin pages (shared between desktop and mobile — responsive components)
const AdminUsersPage = lazy(() => import('../pages/AdminDriversPage'));
const AdminUserDetailPage = lazy(() => import('../pages/AdminDriverDetailPage'));
const AdminTariffsPage = lazy(() => import('../pages/AdminTariffsPage'));
const AdminSettingsPage = lazy(() => import('../pages/AdminSettingsPage'));
const AdminBroadcastsPage = lazy(() => import('../pages/AdminBroadcastsPage'));
const AdminPremiumOrdersPage = lazy(() => import('../pages/AdminPremiumOrdersPage'));
const UserbotManagementPage = lazy(() => import('../pages/UserbotManagementPage'));

// Role-based default page redirect
function RoleBasedHome() {
  const { isAuthenticated, userRole, loading } = useMobileAuth();

  console.log('[RoleBasedHome] isAuthenticated:', isAuthenticated, 'userRole:', userRole);

  // Auth hali tekshirilayotgan bo'lsa — loader
  if (loading) return <MobileLoading fullScreen />;

  // Autentifikatsiya qilinmagan foydalanuvchi — app auth gate ko'rsatadi
  if (!isAuthenticated) {
    return <MiniAppUnavailable />;
  }

  if (userRole === 'not_selected') {
    return <MobileRoleSelect />;
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

function MiniAppUnavailable() {
  const { authError, refreshUser, loading } = useMobileAuth();

  return (
    <main className="m-role-screen">
      <section className="m-role-panel" aria-labelledby="mini-app-unavailable-title">
        <div className="m-role-user">
          <div className="m-role-avatar">Y</div>
          <div>
            <p className="m-role-kicker">YukBor Mini App</p>
            <h1 id="mini-app-unavailable-title">Telegram orqali oching</h1>
          </div>
        </div>
        <p className="m-role-lead">
          {authError || 'Mini app foydalanuvchini Telegramdan avtomatik taniydi.'}
        </p>
        {authError && (
          <button
            type="button"
            className="m-btn m-btn-primary m-btn-lg m-btn-full"
            onClick={refreshUser}
            disabled={loading}
          >
            {loading ? 'Tekshirilmoqda...' : 'Qayta urinish'}
          </button>
        )}
      </section>
    </main>
  );
}

function MobileAppContent() {
  const location = useLocation();
  const { isAuthenticated, userRole, loading, needsRoleSelection } = useMobileAuth();

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
  const showBottomNav = isAuthenticated && !needsRoleSelection;

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

  if (!isAuthenticated) {
    return (
      <div className="m-app">
        <MiniAppUnavailable />
      </div>
    );
  }

  if (needsRoleSelection) {
    return (
      <div className="m-app">
        <MobileRoleSelect />
      </div>
    );
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
          <Route path="/login" element={<Navigate to="/mobile" replace />} />
          <Route path="/cargo/:id" element={<MobileCargoDetail />} />
          <Route path="/tariffs" element={<TariffsPage mobile />} />

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
            path="/admin/cargo-owners"
            element={
              <MobileProtectedRoute>
                <AdminUsersPage defaultRole="factory" mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/tariffs"
            element={
              <MobileProtectedRoute>
                <AdminTariffsPage mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <MobileProtectedRoute>
                <AdminSettingsPage mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/broadcasts"
            element={
              <MobileProtectedRoute>
                <AdminBroadcastsPage mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/premium-orders"
            element={
              <MobileProtectedRoute>
                <AdminPremiumOrdersPage mobile />
              </MobileProtectedRoute>
            }
          />
          <Route
            path="/admin/userbots"
            element={
              <MobileProtectedRoute>
                <UserbotManagementPage mobile />
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
