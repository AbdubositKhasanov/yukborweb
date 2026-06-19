import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { StaticDataProvider } from './context/StaticDataContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import PremiumUpgradeListener from './components/PremiumUpgradeListener';
import { PageSkeleton } from './components/LoadingSkeleton';
import { trackPageView, trackLogout } from './services/analytics';

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
const UserbotManagementPage = lazy(() => import('./pages/UserbotManagementPage'));
const AdminDriversPage = lazy(() => import('./pages/AdminDriversPage'));
const AdminDriverDetailPage = lazy(() => import('./pages/AdminDriverDetailPage'));
const AdminTariffsPage = lazy(() => import('./pages/AdminTariffsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AdminBroadcastsPage = lazy(() => import('./pages/AdminBroadcastsPage'));
const AdminPremiumOrdersPage = lazy(() => import('./pages/AdminPremiumOrdersPage'));
const TariffsPage = lazy(() => import('./pages/TariffsPage'));

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
            path="/platform-loads"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <PlatformLoadsPage />
              </ProtectedRoute>
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
            path="/admin/userbots"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <UserbotManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tariffs"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminTariffsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/broadcasts"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminBroadcastsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/premium-orders"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminPremiumOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/drivers"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminDriversPage defaultRole="driver" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/drivers/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminDriverDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminDriversPage defaultRole="any" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminDriverDetailPage />
              </ProtectedRoute>
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
