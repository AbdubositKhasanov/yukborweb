import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StaticDataProvider } from './context/StaticDataContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import BrowseTransportsPage from './pages/BrowseTransportsPage';
import CreateTransportPage from './pages/CreateTransportPage';
import CreateHarbingerPage from './pages/CreateHarbingerPage';
import MyOrdersPage from './pages/MyOrdersPage';
import MyTransportsPage from './pages/MyTransportsPage';
import MyHarbingersPage from './pages/MyHarbingersPage';
import DriverStatusPage from './pages/DriverStatusPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Check for existing auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    }

    // Listen for login events from Telegram bot
    const handleMessage = (event) => {
      // Telegram bot will send token via postMessage
      if (event.data && event.data.type === 'telegram_auth' && event.data.token) {
        const token = event.data.token;
        localStorage.setItem('authToken', token);
        setAuthToken(token);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthToken(null);
    window.location.href = '/';
  };

  const isAuthenticated = !!authToken;

  return (
    <StaticDataProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          <Navigation 
            isAuthenticated={isAuthenticated} 
            onLogout={handleLogout}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<SearchPage />} />
            <Route path="/transports" element={<BrowseTransportsPage />} />
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
              path="/my-orders" 
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <MyOrdersPage />
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
          </Routes>
        </div>
      </Router>
    </StaticDataProvider>
  );
}

export default App;
