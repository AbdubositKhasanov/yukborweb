export const MOBILE_TAB_CONFIG = {
  driver: [
    { id: 'home', section: 'driverStatus', icon: '⚡', label: 'Holat', path: '/mobile/status' },
    { id: 'search', section: 'search', icon: '📦', label: 'Yuklar', path: '/mobile/yuklar' },
    { id: 'orders', section: 'myTransports', icon: '🚚', label: 'Transport', path: '/mobile/my-transports' },
    { id: 'profile', section: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  factory: [
    { id: 'home', section: 'myOrders', icon: '📋', label: 'Buyurtma', path: '/mobile/orders' },
    { id: 'search', section: 'search', icon: '📦', label: 'Yuklar', path: '/mobile/yuklar' },
    { id: 'add', section: 'createOrder', icon: '➕', label: "Qo'shish", path: '/mobile/create-order' },
    { id: 'transports', section: 'transports', icon: '🚚', label: 'Transport', path: '/mobile/transports' },
    { id: 'profile', section: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
  logist: [
    { id: 'home', section: 'search', icon: '📦', label: 'Yuklar', path: '/mobile' },
    { id: 'internal', section: 'platformLoads', icon: '⭐', label: 'Ichki', path: '/mobile/internal-loads', requireDispatcher: true },
    { id: 'shippers', section: 'shippers', icon: '🏢', label: 'Yukchilar', path: '/mobile/shippers', requireDispatcher: true },
    { id: 'transports', section: 'transports', icon: '🚚', label: 'Transport', path: '/mobile/transports' },
    { id: 'drivers', section: 'myPartners', icon: '👥', label: 'Hamkor', path: '/mobile/drivers' },
    { id: 'listings', section: 'myListings', icon: '📋', label: "E'lonlarim", path: '/mobile/my-listings' },
    { id: 'profile', section: 'profile', icon: '👤', label: 'Profil', path: '/mobile/profile' },
  ],
};

export function getMobileTabs(userRole = 'logist', navigation = null, isInternalDispatcher = false) {
  const tabs = MOBILE_TAB_CONFIG[userRole] || MOBILE_TAB_CONFIG.logist;
  const visibleSections = navigation?.roleSections;
  return tabs.filter((tab) => {
    if (tab.requireDispatcher && !isInternalDispatcher) return false;
    if (isInternalDispatcher && tab.id === 'internal') return true;
    if (!Array.isArray(visibleSections)) return true;
    return visibleSections.includes(tab.section);
  });
}

export function getDefaultMobilePath(userRole = 'logist', navigation = null) {
  const [firstTab] = getMobileTabs(userRole, navigation);
  if (firstTab) return firstTab.path;
  return '/mobile/profile';
}
