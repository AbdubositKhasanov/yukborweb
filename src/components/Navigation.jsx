import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUserMe } from '../services/api';
import { PRIMARY_NAV_STATE, shouldReplacePrimaryNav } from '../utils/navigationHistory';

const SECTION = {
  search: 'search',
  tariffs: 'tariffs',
  transports: 'transports',
  driverStatus: 'driverStatus',
  myOrders: 'myOrders',
  myPartners: 'myPartners',
  myTransports: 'myTransports',
  myHarbingers: 'myHarbingers',
  createOrder: 'createOrder',
  createTransport: 'createTransport',
  createHarbinger: 'createHarbinger',
  platformLoads: 'platformLoads',
  profile: 'profile',
  admin: 'admin',
  adminUsers: 'adminUsers',
  adminDrivers: 'adminDrivers',
  adminCargoOwners: 'adminCargoOwners',
  adminTariffs: 'adminTariffs',
  adminSettings: 'adminSettings',
  adminBroadcasts: 'adminBroadcasts',
  adminPremiumOrders: 'adminPremiumOrders',
  adminUserbots: 'adminUserbots',
};

// Tab configuration by role
const TAB_CONFIG = {
  driver: [
    { path: '/', label: 'Yuklar', auth: false, section: SECTION.search },
    { path: '/tariffs', label: 'Tariflar', auth: false, section: SECTION.tariffs },
    { path: '/driver-status', label: 'Haydovchi holati', auth: true, section: SECTION.driverStatus },
    { path: '/my-transports', label: 'Transportlarim', auth: true, section: SECTION.myTransports },
    { path: '/my-harbingers', label: 'Xabarchilarim', auth: true, section: SECTION.myHarbingers },
    { path: '/profile', label: 'Profil', auth: true, section: SECTION.profile },
  ],
  logist: [
    { path: '/', label: 'Yuklar', auth: false, section: SECTION.search },
    { path: '/tariffs', label: 'Tariflar', auth: false, section: SECTION.tariffs },
    { path: '/platform-loads', label: 'Platforma yuklari', auth: true, section: SECTION.platformLoads, requireDispatcher: true },
    { path: '/transports', label: 'Transportlar', auth: false, section: SECTION.transports },
    { path: '/my-orders', label: 'Buyurtmalarim', auth: true, section: SECTION.myOrders },
    { path: '/my-drivers', label: 'Hamkorlarim', auth: true, section: SECTION.myPartners },
    { path: '/my-transports', label: 'Transportlarim', auth: true, section: SECTION.myTransports },
    { path: '/my-harbingers', label: 'Xabarchilarim', auth: true, section: SECTION.myHarbingers },
    { path: '/profile', label: 'Profil', auth: true, section: SECTION.profile },
  ],
  factory: [
    { path: '/', label: 'Yuklar', auth: false, section: SECTION.search },
    { path: '/tariffs', label: 'Tariflar', auth: false, section: SECTION.tariffs },
    { path: '/transports', label: 'Transportlar', auth: false, section: SECTION.transports },
    { path: '/my-orders', label: 'Buyurtmalarim', auth: true, section: SECTION.myOrders },
    { path: '/profile', label: 'Profil', auth: true, section: SECTION.profile },
  ],
  not_selected: [
    { path: '/', label: 'Yuklar', auth: false, section: SECTION.search },
    { path: '/tariffs', label: 'Tariflar', auth: false, section: SECTION.tariffs },
    { path: '/transports', label: 'Transportlar', auth: false, section: SECTION.transports },
    { path: '/profile', label: 'Profil', auth: true, section: SECTION.profile },
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
  const [navigation, setNavigation] = useState(null);

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
            setNavigation(response.result.navigation || null);
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        }
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

    const roleSections = navigation?.roleSections;
    tabs = tabs.filter((tab) => {
      if (!tab.section) return !tab.optional;
      if (!Array.isArray(roleSections)) return !tab.optional;
      return roleSections.includes(tab.section);
    });

    if (!permissions?.createOrder) {
      tabs = tabs.filter(tab => tab.path !== '/create-order');
    }
    if (!permissions?.createTransport) {
      tabs = tabs.filter(tab => tab.path !== '/create-transport');
    }
    if (!permissions?.createHarbinger) {
      tabs = tabs.filter(tab => tab.path !== '/create-harbinger');
    }

    // Filter tabs that require dispatcher access
    if (!isInternalDispatcher) {
      tabs = tabs.filter(tab => !tab.requireDispatcher);
    }

    // Admin pages live under one desktop tab; detailed sections are inside /admin.
    if (isAdmin) {
      tabs = [...tabs, { path: '/admin', label: 'Admin', auth: true, section: SECTION.admin }];
    }

    return tabs;
  };

  const tabs = getTabs();
  const tabPaths = tabs.map((tab) => tab.path);

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
          <Link
            key={tab.path}
            to={tab.path}
            replace={shouldReplacePrimaryNav(location, tab.path, tabPaths)}
            state={PRIMARY_NAV_STATE}
          >
            <button 
              className={`nav-button ${isTabActive(location.pathname, tab.path) ? 'active' : ''}`}
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

function isTabActive(currentPath, tabPath) {
  if (currentPath === tabPath) return true;
  return tabPath === '/admin' && currentPath.startsWith('/admin/');
}
