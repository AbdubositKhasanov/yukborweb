/**
 * Bottom Navigation Component
 * Fixed 5 tabs, role-aware functionality
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TAB_CONFIG = {
  driver: [
    { id: 'home', icon: '🏠', label: 'Asosiy', path: '/mobile' },
    { id: 'search', icon: '🔍', label: 'Qidirish', path: '/mobile' },
    { id: 'add', icon: '⚡', label: 'Holat', path: '/mobile/status' },
    { id: 'orders', icon: '🚚', label: 'Transport', path: '/mobile/my-transports' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  shipper: [
    { id: 'home', icon: '🏠', label: 'Asosiy', path: '/mobile' },
    { id: 'search', icon: '🚚', label: 'Transport', path: '/mobile/transports' },
    { id: 'add', icon: '➕', label: "Qo'shish", path: '/mobile/create-order' },
    { id: 'orders', icon: '📋', label: 'Buyurtma', path: '/mobile/orders' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  logist: [
    { id: 'home', icon: '🏠', label: 'Asosiy', path: '/mobile' },
    { id: 'search', icon: '👥', label: 'Haydovchi', path: '/mobile/drivers' },
    { id: 'add', icon: '➕', label: "Qo'shish", path: '/mobile/create-order' },
    { id: 'orders', icon: '📋', label: 'Buyurtma', path: '/mobile/orders' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  admin: [
    { id: 'home', icon: '🏠', label: 'Asosiy', path: '/mobile' },
    { id: 'search', icon: '👥', label: 'Haydovchi', path: '/mobile/drivers' },
    { id: 'add', icon: '➕', label: "Qo'shish", path: '/mobile/create-order' },
    { id: 'orders', icon: '📋', label: 'Buyurtma', path: '/mobile/orders' },
    { id: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
};

export default function BottomNav({ activeTab, userRole = 'shipper' }) {
  const tabs = TAB_CONFIG[userRole] || TAB_CONFIG.shipper;

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
