import { logEvent as firebaseLogEvent, setUserProperties as firebaseSetUserProperties, setUserId } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Safe wrapper — no-op agar analytics yuklanmagan bo'lsa
 */
const safeLogEvent = (eventName, params = {}) => {
  if (!analytics) return;
  try {
    firebaseLogEvent(analytics, eventName, params);
  } catch (e) {
    // Silent fail — analytics xatosi ilovani buzmasligi kerak
  }
};

// ============================================
// PLATFORM DETECTION
// ============================================

const getPlatform = () => {
  return window.location.pathname.startsWith('/mobile') ? 'mobile' : 'desktop';
};

// ============================================
// APP LIFECYCLE
// ============================================

export const trackAppOpen = () => {
  safeLogEvent('app_open', { platform: getPlatform() });
};

export const trackFirstOpen = () => {
  const hasOpened = localStorage.getItem('yukbor_first_open');
  if (!hasOpened) {
    safeLogEvent('first_open', { platform: getPlatform() });
    localStorage.setItem('yukbor_first_open', 'true');
  }
};

// ============================================
// PAGE VIEWS
// ============================================

export const trackPageView = (screenName) => {
  safeLogEvent('screen_view', {
    screen_name: screenName,
    platform: getPlatform(),
  });
};

// ============================================
// AUTHENTICATION
// ============================================

export const trackLogin = (method, userRole) => {
  safeLogEvent('login', {
    method,
    user_role: userRole || 'unknown',
  });
};

export const trackLogout = () => {
  safeLogEvent('logout');
};

// ============================================
// SEARCH
// ============================================

export const trackSearch = (searchType, filters = {}) => {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== null);
  safeLogEvent('search', {
    search_type: searchType,
    has_filters: hasFilters,
  });
};

// ============================================
// CARGO
// ============================================

export const trackCargoView = (cargoId) => {
  safeLogEvent('view_cargo', { cargo_id: cargoId });
};

export const trackPhoneRequest = (result) => {
  safeLogEvent('phone_request', { result });
};

export const trackPhoneView = () => {
  safeLogEvent('view_phone', { source: getPlatform() });
};

// ============================================
// ORDERS
// ============================================

export const trackOrderCreate = () => {
  safeLogEvent('create_order');
};

export const trackOrderUpdate = (orderId) => {
  safeLogEvent('update_order', { order_id: orderId });
};

export const trackOrderDelete = (orderId) => {
  safeLogEvent('delete_order', { order_id: orderId });
};

export const trackOrderView = (orderId) => {
  safeLogEvent('view_order', { order_id: orderId });
};

// ============================================
// TRANSPORTS
// ============================================

export const trackTransportCreate = () => {
  safeLogEvent('create_transport');
};

export const trackTransportUpdate = (transportId) => {
  safeLogEvent('update_transport', { transport_id: transportId });
};

export const trackTransportDelete = (transportId) => {
  safeLogEvent('delete_transport', { transport_id: transportId });
};

export const trackTransportView = (transportId) => {
  safeLogEvent('view_transport', { transport_id: transportId });
};

// ============================================
// HARBINGERS
// ============================================

export const trackHarbingerCreate = () => {
  safeLogEvent('create_harbinger');
};

export const trackHarbingerUpdate = (harbingerId) => {
  safeLogEvent('update_harbinger', { harbinger_id: harbingerId });
};

export const trackHarbingerDelete = (harbingerId) => {
  safeLogEvent('delete_harbinger', { harbinger_id: harbingerId });
};

// ============================================
// DRIVERS
// ============================================

export const trackDriverStatusToggle = (isActive) => {
  safeLogEvent('driver_status_toggle', { is_active: isActive });
};

export const trackDriverInvite = () => {
  safeLogEvent('driver_invite');
};

export const trackDriverOfferSent = (driverId, orderId) => {
  safeLogEvent('offer_sent', {
    driver_id: driverId,
    order_id: orderId,
  });
};

// ============================================
// PROFILE
// ============================================

export const trackProfileView = () => {
  safeLogEvent('profile_view');
};

export const trackProfileUpdate = () => {
  safeLogEvent('profile_update');
};

// ============================================
// USER PROPERTIES
// ============================================

export const setAnalyticsUserProperties = (userId, role, isDispatcher) => {
  if (!analytics) return;
  try {
    setUserId(analytics, String(userId));
    firebaseSetUserProperties(analytics, {
      user_role: role || 'unknown',
      is_dispatcher: String(!!isDispatcher),
      platform: getPlatform(),
    });
  } catch (e) {
    // Silent fail
  }
};
