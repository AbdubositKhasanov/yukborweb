/**
 * Bottom Navigation Component
 * Fixed 5 tabs, role-aware functionality
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMobileTabs } from '../navigationConfig';
import { PRIMARY_NAV_STATE, shouldReplacePrimaryNav } from '../../utils/navigationHistory';

export default function BottomNav({ activeTab, userRole = 'logist', navigation = null, isInternalDispatcher = false }) {
  const location = useLocation();
  const tabs = getMobileTabs(userRole, navigation, isInternalDispatcher);
  const tabPaths = tabs.map((tab) => tab.path);

  if (tabs.length === 0) return null;

  return (
    <nav className="m-bottomnav">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.path}
          replace={shouldReplacePrimaryNav(location, tab.path, tabPaths)}
          state={PRIMARY_NAV_STATE}
          className={`m-bottomnav-item ${activeTab === tab.id ? 'active' : ''}`}
        >
          <span className="m-bottomnav-icon">{tab.icon}</span>
          <span className="m-bottomnav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
