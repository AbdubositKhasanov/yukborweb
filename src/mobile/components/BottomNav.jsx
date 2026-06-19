/**
 * Bottom Navigation Component
 * Fixed 5 tabs, role-aware functionality
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { getMobileTabs } from '../navigationConfig';

export default function BottomNav({ activeTab, userRole = 'logist', navigation = null }) {
  const tabs = getMobileTabs(userRole, navigation);

  if (tabs.length === 0) return null;

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
