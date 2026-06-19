import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUserMe } from '../services/api';

// Tab configuration by role
const TAB_CONFIG = {
  driver: [
    { path: '/', label: 'Yuklar', auth: false },
    { path: '/tariffs', label: 'Tariflar', auth: false },
    { path: '/driver-status', label: 'Haydovchi holati', auth: true },
    { path: '/my-transports', label: 'Transportlarim', auth: true },
    { path: '/my-harbingers', label: 'Xabarchilarim', auth: true },
    { path: '/profile', label: 'Profil', auth: true },
  ],
  logist: [
    { path: '/', label: 'Yuklar', auth: false },
    { path: '/tariffs', label: 'Tariflar', auth: false },
    { path: '/platform-loads', label: 'Platforma yuklari', auth: true, requireDispatcher: true },
    { path: '/transports', label: 'Transportlar', auth: false },
    { path: '/my-orders', label: 'Buyurtmalarim', auth: true },
    { path: '/my-drivers', label: 'Hamkorlarim', auth: true },
    { path: '/my-transports', label: 'Transportlarim', auth: true },
    { path: '/my-harbingers', label: 'Xabarchilarim', auth: true },
    { path: '/profile', label: 'Profil', auth: true },
  ],
  factory: [
    { path: '/', label: 'Yuklar', auth: false },
    { path: '/tariffs', label: 'Tariflar', auth: false },
    { path: '/transports', label: 'Transportlar', auth: false },
    { path: '/my-orders', label: 'Buyurtmalarim', auth: true },
    { path: '/profile', label: 'Profil', auth: true },
  ],
};

// Default tabs for unauthenticated users
const DEFAULT_TABS = [
  { path: '/', label: 'Yuklar', auth: false },
  { path: '/tariffs', label: 'Tariflar', auth: false },
  { path: '/transports', label: 'Transportlar', auth: false },
];

const normalizeRole = (role) => {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'haydovchi') return 'driver';
  if (normalized === 'zavod') return 'factory';
  return normalized;
};

export default function Navigation({ isAuthenticated, onLogout }) {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (isAuthenticated) {
        try {
          const response = await getUserMe();
          if (response.code === 200 && response.result) {
            setUserRole(normalizeRole(response.result.type));
            setIsInternalDispatcher(response.result.isInternalDispatcher === true);
            setPermissions(response.result.permissions || null);
            setIsAdmin(response.result.isAdmin === true);
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [isAuthenticated]);

  // Get tabs based on role
  const getTabs = () => {
    if (!isAuthenticated) {
      return DEFAULT_TABS;
    }

    // Use role-specific tabs or fallback to logist tabs
    let tabs = TAB_CONFIG[userRole] || TAB_CONFIG.logist;

    // Filter "Harbinger yaratish" for drivers if no permission
    if (userRole === 'driver' && !permissions?.createHarbinger) {
      tabs = tabs.filter(tab => tab.path !== '/create-harbinger');
    }

    // Filter tabs that require dispatcher access
    if (!isInternalDispatcher) {
      tabs = tabs.filter(tab => !tab.requireDispatcher);
    }

    // Add admin tab for admins
    if (isAdmin) {
      tabs = [
        ...tabs,
        { path: '/admin/users', label: 'Foydalanuvchilar', auth: true },
        { path: '/admin/cargo-owners', label: 'Yuk egalari', auth: true },
        { path: '/admin/tariffs', label: 'Tariflar', auth: true },
        { path: '/admin/settings', label: 'Sozlamalar', auth: true },
        { path: '/admin/broadcasts', label: 'Broadcast', auth: true },
        { path: '/admin/premium-orders', label: 'Premium yuklar', auth: true },
        { path: '/admin/userbots', label: 'Userbotlar', auth: true },
      ];
    }

    return tabs;
  };

  const tabs = getTabs();

  return (
    <nav className="navbar">
      <div className="navbar-content" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 var(--space-lg)',
        gap: 'var(--space-lg)'
      }}>
        <div className="navbar-brand">
          <img 
            src="/yukbor-logo.jpg" 
            alt="YukBor" 
            className="navbar-logo"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              objectFit: 'cover'
            }}
          />
          <span style={{ 
            fontSize: 'var(--font-size-2xl)', 
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ffffff 0%, var(--brand-accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            YukBor
          </span>
        </div>
      
      <div className="navbar-menu">
        {tabs.map((tab) => (
          <Link key={tab.path} to={tab.path}>
            <button 
              className={`nav-button ${location.pathname === tab.path ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          </Link>
        ))}

        {isAuthenticated && (
          <button className="nav-button danger" onClick={onLogout}>
            Chiqish
          </button>
        )}

        {!isAuthenticated && (
          <Link to="/login">
            <button className="nav-button primary" style={{
              background: 'var(--brand-accent, #4CAF50)',
              color: 'white',
              fontWeight: '600',
              padding: '8px 20px',
              borderRadius: '6px',
              animation: 'none'
            }}>
              Kirish
            </button>
          </Link>
        )}
      </div>
      </div>
    </nav>
  );
}
