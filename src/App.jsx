import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { StaticDataProvider } from './context/StaticDataContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import PremiumUpgradeListener from './components/PremiumUpgradeListener';
import { PageSkeleton } from './components/LoadingSkeleton';
import { trackPageView, trackLogout } from './services/analytics';
import { getUserMe } from './services/api';

// Lazy load Mobile App (isolated module)
const MobileApp = lazy(() => import('./mobile/MobileApp'));

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const BrowseTransportsPage = lazy(() => import('./pages/BrowseTransportsPage'));
const CreateTransportPage = lazy(() => import('./pages/CreateTransportPage'));
const CreateHarbingerPage = lazy(() => import('./pages/CreateHarbingerPage'));
const CreateOrderPage = lazy(() => import('./pages/CreateOrderPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const MyTransportsPage = lazy(() => import('./pages/MyTransportsPage'));
const MyHarbingersPage = lazy(() => import('./pages/MyHarbingersPage'));
const MyDriversPage = lazy(() => import('./pages/MyDriversPage'));
const DriverStatusPage = lazy(() => import('./pages/DriverStatusPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PlatformLoadsPage = lazy(() => import('./pages/PlatformLoadsPage'));
const ShippersPage = lazy(() => import('./pages/ShippersPage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const ViewHistoryPage = lazy(() => import('./pages/ViewHistoryPage'));
const AdminCallRecordingsPage = lazy(() => import('./pages/AdminCallRecordingsPage'));
const AdminDriverLocationsPage = lazy(() => import('./pages/AdminDriverLocationsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const UserbotManagementPage = lazy(() => import('./pages/UserbotManagementPage'));
const AdminDriversPage = lazy(() => import('./pages/AdminDriversPage'));
const AdminDriverDetailPage = lazy(() => import('./pages/AdminDriverDetailPage'));
const AdminTariffsPage = lazy(() => import('./pages/AdminTariffsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AdminBroadcastsPage = lazy(() => import('./pages/AdminBroadcastsPage'));
const AdminPremiumOrdersPage = lazy(() => import('./pages/AdminPremiumOrdersPage'));
const AdminSenderBlacklistPage = lazy(() => import('./pages/AdminSenderBlacklistPage'));
const AdminHarbingersPage = lazy(() => import('./pages/AdminHarbingersPage'));
const TariffsPage = lazy(() => import('./pages/TariffsPage'));

function isPhoneBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  if (navigator.userAgentData?.mobile === true) return true;

  const userAgent = navigator.userAgent || '';
  const phoneUserAgent = /Android.*Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini|webOS|BlackBerry/i;
  if (phoneUserAgent.test(userAgent)) return true;

  return window.matchMedia?.('(max-width: 767px) and (pointer: coarse)').matches === true;
}

function AdminRoute({ children, isAuthenticated }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async () => {
      if (!isAuthenticated) {
        setChecking(false);
        return;
      }
      try {
        const response = await getUserMe();
        if (!cancelled) {
          setIsAdmin(response.code === 200 && response.result?.isAdmin === true);
        }
      } catch (e) {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (checking) return <PageSkeleton />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function InternalDispatcherRoute({ children, isAuthenticated }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      if (!isAuthenticated) {
        setChecking(false);
        return;
      }
      try {
        const response = await getUserMe();
        if (!cancelled) {
          setAllowed(response.code === 200 && (
            response.result?.isInternalDispatcher === true || response.result?.isAdmin === true
          ));
        }
      } catch (_) {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (checking) return <PageSkeleton />;
  if (!allowed) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const [authToken, setAuthToken] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Check for existing auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    }

    // Listen for login events from Telegram bot
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'telegram_auth' && event.data.token) {
        const token = event.data.token;
        localStorage.setItem('authToken', token);
        setAuthToken(token);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Track page views (Firebase Analytics)
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  const handleLogout = () => {
    trackLogout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthToken(null);
    window.location.href = '/';
  };

  const isAuthenticated = !!authToken;

  // Check if on mobile route - render mobile app without desktop navigation
  const isMobileRoute = location.pathname.startsWith('/mobile');

  if (!isMobileRoute && isPhoneBrowser()) {
    return <Navigate to="/mobile" replace state={location.state} />;
  }

  if (isMobileRoute) {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/mobile/*" element={<MobileApp />} />
          </Routes>
        </Suspense>
        <PremiumUpgradeListener />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navigation isAuthenticated={isAuthenticated} onLogout={handleLogout} />

      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<SearchPage />} />
          <Route path="/transports" element={<BrowseTransportsPage />} />
          <Route path="/tariffs" element={<TariffsPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/driver-status"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <DriverStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-transport"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CreateTransportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-harbinger"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CreateHarbingerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-order"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CreateOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-order/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CreateOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/internal-loads"
            element={
              <InternalDispatcherRoute isAuthenticated={isAuthenticated}>
                <PlatformLoadsPage />
              </InternalDispatcherRoute>
            }
          />
          <Route path="/platform-loads" element={<Navigate to="/internal-loads" replace />} />
          <Route
            path="/shippers"
            element={
              <InternalDispatcherRoute isAuthenticated={isAuthenticated}>
                <ShippersPage />
              </InternalDispatcherRoute>
            }
          />
          <Route
            path="/reminders"
            element={
              <InternalDispatcherRoute isAuthenticated={isAuthenticated}>
                <RemindersPage />
              </InternalDispatcherRoute>
            }
          />
          <Route
            path="/view-history"
            element={
              <InternalDispatcherRoute isAuthenticated={isAuthenticated}>
                <ViewHistoryPage />
              </InternalDispatcherRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-drivers"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MyDriversPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-transports"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MyTransportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-harbingers"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MyHarbingersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/userbots"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <UserbotManagementPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/tariffs"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminTariffsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminSettingsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/broadcasts"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminBroadcastsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/premium-orders"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminPremiumOrdersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/sender-blacklist"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminSenderBlacklistPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/harbingers"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminHarbingersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/view-history"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <ViewHistoryPage admin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/call-recordings"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminCallRecordingsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/driver-locations"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriverLocationsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/drivers"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriversPage defaultRole="driver" />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/drivers/:id"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriverDetailPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/cargo-owners"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriversPage defaultRole="factory" />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/cargo-owners/:id"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriverDetailPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriversPage defaultRole="any" />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <AdminRoute isAuthenticated={isAuthenticated}>
                <AdminDriverDetailPage />
              </AdminRoute>
            }
          />
        </Routes>
      </Suspense>

      <PremiumUpgradeListener />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <StaticDataProvider>
          <Router>
            <AppContent />
          </Router>
        </StaticDataProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
