/**
 * Bottom Navigation Component
 * Fixed 5 tabs, role-aware functionality
 */
import React from 'react';
import { Link } from 'react-router-dom';

// TAB_CONFIG - Role-specific navigation
// Roles: driver, factory, logist (default)
const TAB_CONFIG = {
  driver: [
    { id: 'home', icon: '⚡', label: 'Holat', path: '/mobile/status' }, // Default for driver
    { id: 'search', icon: '📦', label: 'Yuklar', path: '/mobile/yuklar' },
    { id: 'orders', icon: '🚚', label: 'Transport', path: '/mobile/my-transports' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  factory: [
    { id: 'home', icon: '📋', label: 'Buyurtma', path: '/mobile/orders' }, // Default for factory
    { id: 'search', icon: '📦', label: 'Yuklar', path: '/mobile/yuklar' },
    { id: 'add', icon: '➕', label: "Qo'shish", path: '/mobile/create-order' },
    { id: 'transports', icon: '🚚', label: 'Transport', path: '/mobile/transports' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  logist: [
    { id: 'home', icon: '📦', label: 'Yuklar', path: '/mobile' },
    { id: 'transports', icon: '🚚', label: 'Transport', path: '/mobile/transports' },
    { id: 'drivers', icon: '👥', label: 'Haydovchi', path: '/mobile/drivers' },
    { id: 'listings', icon: '📋', label: "E'lonlarim", path: '/mobile/my-listings' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
};

export default function BottomNav({ activeTab, userRole = 'logist' }) {
  const tabs = TAB_CONFIG[userRole] || TAB_CONFIG.logist;

  return (
    <nav className="m-bottomnav">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.path}
          className={`m-bottomnav-item ${activeTab === tab.id ? 'active' : ''}`}
        >
          <span className="m-bottomnav-icon">{tab.icon}</span>
          <span className="m-bottomnav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
