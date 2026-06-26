import axios from 'axios';
import CryptoJS from 'crypto-js';
import { showError } from '../utils/toast';
import { inferPremiumFeature, isPremiumUpgradeError, openPremiumUpgrade } from '../utils/premiumUpgrade';
import {
  trackSearch,
  trackOrderCreate,
  trackOrderUpdate,
  trackOrderDelete,
  trackTransportCreate,
  trackTransportUpdate,
  trackTransportDelete,
  trackHarbingerCreate,
  trackHarbingerUpdate,
  trackHarbingerDelete,
  trackDriverStatusToggle,
  trackDriverInvite,
  trackDriverOfferSent,
  trackProfileUpdate,
} from './analytics';

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'your-secret-key';

/**
 * Encrypt sensitive data before storing
 */
const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
};

/**
 * Decrypt sensitive data after retrieving
 */
const decryptData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Get auth token securely
 */
const getAuthToken = () => {
  return localStorage.getItem('authToken');
  // try {
  //   const encryptedToken = localStorage.getItem('authToken');
  //   if (!encryptedToken) return null;
  //
  //   // In production, use encrypted tokens
  //   if (import.meta.env.PROD) {
  //     return decryptData(encryptedToken);
  //   }
  //   return encryptedToken;
  // } catch (error) {
  //   console.error('Error getting auth token:', error);
  //   return null;
  // }
};

/**
 * Set auth token securely
 */
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
  // try {
  //   // In production, encrypt the token
  //   const tokenToStore = import.meta.env.PROD ? encryptData(token) : token;
  //   localStorage.setItem('authToken', tokenToStore);
  // } catch (error) {
  //   console.error('Error setting auth token:', error);
  // }
};

/**
 * Create axios instance
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getApiErrorMessage = (data) => {
  if (typeof data === 'string') return data;
  return data?.message || '';
};

const inferFeatureFromRequest = (config, message = '') => {
  const url = String(config?.url || '').toLowerCase();
  const params = config?.params || {};
  if (params.phoneAccess === true || params.phoneAccess === 'true') return 'viewCargoPhone';
  if (url.includes('/transport/')) return 'viewTransportPhone';
  if (url.includes('/cargo/')) return 'viewCargoPhone';
  if (url.includes('/harbinger')) return 'createHarbinger';
  if (url.includes('/offer')) return 'offerToDriver';
  return inferPremiumFeature(message || url);
};

const isLikelyPremiumAccessRequest = (config) => {
  const url = String(config?.url || '').toLowerCase();
  const params = config?.params || {};
  return (
    params.phoneAccess === true ||
    params.phoneAccess === 'true' ||
    url.includes('/cargo/') ||
    url.includes('/transport/') ||
    url.includes('/harbinger') ||
    url.includes('/offer') ||
    url.includes('/create/order') ||
    url.includes('/create/transport')
  );
};

/**
 * Request interceptor - Add auth token and security headers
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = token;
    }

    // Add security headers
    config.headers['X-Request-Time'] = Date.now();
    
    // CSRF token (if available)
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Cancel qilingan so'rovlarda toast ko'rsatmaymiz
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      const message = getApiErrorMessage(data);

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          if (window.location.pathname.startsWith('/mobile')) {
            const isMiniAppLoginRequest = error.config?.url?.includes('/login/telegram-mini-app');
            if (isMiniAppLoginRequest) break;
            window.dispatchEvent(new Event('mobile-auth-token-cleared'));
          } else if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;

        case 403:
          if (isPremiumUpgradeError(message) && isLikelyPremiumAccessRequest(error.config)) {
            openPremiumUpgrade({
              featureKey: inferFeatureFromRequest(error.config, message),
              message,
              source: 'api',
            });
          } else {
            showError(message || 'Sizda bu amalni bajarish uchun ruxsat yo\'q');
          }
          break;

        case 404:
          showError('Ma\'lumot topilmadi');
          break;

        case 429:
          showError('Juda ko\'p so\'rov yuborildi. Iltimos, biroz kuting');
          break;

        case 500:
          showError('Server xatosi. Iltimos, keyinroq urinib ko\'ring');
          break;

        default:
          showError(message || 'Xatolik yuz berdi');
      }
    } else if (error.request) {
      // Network error
      showError('Tarmoq xatosi. Internet ulanishingizni tekshiring');
    } else {
      // Other errors
      showError('Kutilmagan xatolik yuz berdi');
    }

    return Promise.reject(error);
  }
);

/**
 * API Cache implementation
 */
class APICache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new APICache();

/**
 * Wrapper for cached GET requests
 */
const cachedGet = async (url, params = {}, options = {}) => {
  const cacheKey = `${url}_${JSON.stringify(params)}`;
  
  // Check cache first (unless skipCache is true)
  if (!options.skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch from API
  const response = await apiClient.get(url, { params });
  
  // Cache the result
  if (response.data) {
    apiCache.set(cacheKey, response.data);
  }

  return response.data;
};

// ============================================
// AUTHENTICATION
// ============================================

export const login = async (code) => {
  const response = await apiClient.post('/login/mobile', { code });

  if (response.data.code === 200 && response.data.result) {
    // Backend returns { result: { token: "..." } } - extract token properly
    const token = response.data.result.token || response.data.result;
    setAuthToken(token);
  }

  return response.data;
};

export const loginTelegramMiniApp = async (initData) => {
  const response = await apiClient.post('/login/telegram-mini-app', { initData });

  if (response.data.code === 200 && response.data.result?.token) {
    setAuthToken(response.data.result.token);
  }

  return response.data;
};

/**
 * Get current user data - always fresh, no cache
 * Used for driver status and profile
 */
export const getUserMe = async () => {
  const response = await apiClient.get('/user/me');
  return response.data;
};

// ============================================
// SEARCH & BROWSE
// ============================================

export const textSearchCargos = async (query, page = 0, orderType) => {
  trackSearch('text_search', { query });
  const params = { query, page };
  if (orderType) params.orderType = orderType;
  return cachedGet('/cargos', params, { skipCache: true });
};

export const searchCargos = async (filters = {}) => {
  trackSearch('cargo', filters);
  const params = {
    ...(filters.fromCountry && { from_country: filters.fromCountry }),
    ...(filters.fromRegion && { from_region: filters.fromRegion }),
    ...(filters.fromCity && { from_city: filters.fromCity }),
    ...(filters.toCountry && { to_country: filters.toCountry }),
    ...(filters.toRegion && { to_region: filters.toRegion }),
    ...(filters.toCity && { to_city: filters.toCity }),
    ...(filters.vehicleType && { vehicle_type: filters.vehicleType }),
    ...(filters.minWeight && { min_weight: filters.minWeight }),
    ...(filters.maxWeight && { max_weight: filters.maxWeight }),
    ...(filters.orderType && { orderType: filters.orderType }),
    ...(filters.page !== undefined && { page: filters.page }),
  };

  // Qidiruv har doim yangi ma'lumot olishi kerak - keshlamaymiz
  return cachedGet('/cargos', params, { skipCache: true });
};

export const searchPlatformCargos = async (filters = {}) => {
  trackSearch('platform_cargo', filters);
  const params = {
    ...(filters.fromCountry && { from_country: filters.fromCountry }),
    ...(filters.fromRegion && { from_region: filters.fromRegion }),
    ...(filters.fromCity && { from_city: filters.fromCity }),
    ...(filters.toCountry && { to_country: filters.toCountry }),
    ...(filters.toRegion && { to_region: filters.toRegion }),
    ...(filters.toCity && { to_city: filters.toCity }),
    ...(filters.vehicleType && { vehicle_type: filters.vehicleType }),
    ...(filters.minWeight && { min_weight: filters.minWeight }),
    ...(filters.maxWeight && { max_weight: filters.maxWeight }),
    ...(filters.orderType && { orderType: filters.orderType }),
    ...(filters.page !== undefined && { page: filters.page }),
    source: 'bot',
  };

  return cachedGet('/cargos', params, { skipCache: true });
};

export const searchTransports = async (filters = {}) => {
  trackSearch('transport', filters);
  const params = {
    ...(filters.fromCountry && { from_country: filters.fromCountry }),
    ...(filters.fromRegion && { from_region: filters.fromRegion }),
    ...(filters.fromCity && { from_city: filters.fromCity }),
    ...(filters.vehicleType && { vehicle_type: filters.vehicleType }),
    ...(filters.maxWeight && { max_weight: filters.maxWeight }),
    ...(filters.page !== undefined && { page: filters.page }),
  };

  // Qidiruv har doim yangi ma'lumot olishi kerak - keshlamaymiz
  return cachedGet('/transports', params, { skipCache: true });
};

// ============================================
// STATIC DATA
// ============================================

export const getLocationsAndVehicles = async () => {
  // Cache for longer (static data changes rarely)
  const cacheKey = 'locations_and_vehicles';
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  const response = await apiClient.get('/locationsAndVehicles');
  if (response.data) {
    apiCache.set(cacheKey, response.data);
  }
  return response.data;
};

export const getInfo = async () => {
  return cachedGet('/info');
};

export const getPublicTariffs = async () => {
  return cachedGet('/tariffs', {}, { skipCache: true });
};

// ============================================
// CARGO DETAILS
// ============================================

export const getCargoDetails = async (id) => {
  return cachedGet(`/cargo/${id}`, {}, { skipCache: true }); // Always fresh
};

export const requestCargoPhone = async (id) => {
  // Don't cache phone requests
  const response = await apiClient.get(`/cargo/${id}`, { params: { phoneAccess: true } });
  return response.data;
};

// ============================================
// TRANSPORT DETAILS
// ============================================

export const getTransportDetails = async (id) => {
  return cachedGet(`/transport/${id}`, {}, { skipCache: true });
};

// ============================================
// MY ORDERS
// ============================================

export const getMyOrders = async () => {
  return cachedGet('/my/orders', {}, { skipCache: true });
};

export const getMyOrder = async (id) => {
  return cachedGet(`/my/order/${id}`, {}, { skipCache: true });
};

export const createOrder = async (orderData) => {
  const response = await apiClient.post('/create/order', orderData);
  apiCache.invalidate('orders');
  trackOrderCreate();
  return response.data;
};

export const updateOrder = async (id, orderData) => {
  const response = await apiClient.put(`/update/order/${id}`, orderData);
  apiCache.invalidate('orders');
  trackOrderUpdate(id);
  return response.data;
};

export const updateOrderOwnerStatusPrompt = async (id, enabled) => {
  const response = await apiClient.post(`/orders/${id}/owner-status-prompt`, { enabled });
  apiCache.invalidate('orders');
  return response.data;
};

export const deleteOrder = async (id) => {
  const response = await apiClient.delete(`/order/${id}`);
  apiCache.invalidate('orders');
  trackOrderDelete(id);
  return response.data;
};

// ============================================
// MY TRANSPORTS
// ============================================

export const getMyTransports = async () => {
  return cachedGet('/my/transports', {}, { skipCache: true });
};

export const getMyTransport = async (id) => {
  return cachedGet(`/my/transport/${id}`, {}, { skipCache: true });
};

export const createTransport = async (transportData) => {
  const response = await apiClient.post('/create/transport', transportData);
  apiCache.invalidate('transports');
  trackTransportCreate();
  return response.data;
};

export const updateTransport = async (id, transportData) => {
  const response = await apiClient.put(`/update/transport/${id}`, transportData);
  apiCache.invalidate('transports');
  trackTransportUpdate(id);
  return response.data;
};

export const deleteTransport = async (id) => {
  const response = await apiClient.delete(`/transport/${id}`);
  apiCache.invalidate('transports');
  trackTransportDelete(id);
  return response.data;
};

// ============================================
// DRIVER STATUS & TRANSPORT FORM
// ============================================

export const updateDriverStatus = async (isActive) => {
  const response = await apiClient.post('/update/driver/status', isActive);
  trackDriverStatusToggle(isActive);
  return response.data;
};

/**
 * Get driver transport form - always fresh, no cache
 * Used in driver status edit modal
 */
export const getDriverTransportForm = async () => {
  const response = await apiClient.get('/forms/driver/transport');
  return response.data;
};

export const updateTransportForm = async (id, formData) => {
  const response = await apiClient.put(`/update/transportForm/${id}`, formData);
  return response.data;
};

// ============================================
// MY HARBINGERS
// ============================================

export const getMyHarbingers = async () => {
  return cachedGet('/my/harbingers', {}, { skipCache: true });
};

export const getMyHarbinger = async (id) => {
  return cachedGet(`/my/harbinger/${id}`, {}, { skipCache: true });
};

export const createHarbinger = async (harbingerData) => {
  const response = await apiClient.post('/create/harbinger', harbingerData);
  apiCache.invalidate('harbingers');
  trackHarbingerCreate();
  return response.data;
};

export const updateHarbinger = async (id, harbingerData) => {
  const response = await apiClient.put(`/update/harbinger/${id}`, harbingerData);
  apiCache.invalidate('harbingers');
  trackHarbingerUpdate(id);
  return response.data;
};

export const deleteHarbinger = async (id) => {
  const response = await apiClient.delete(`/harbinger/${id}`);
  apiCache.invalidate('harbingers');
  trackHarbingerDelete(id);
  return response.data;
};

// ============================================
// SAVED FORMS (TEMPLATES)
// ============================================

export const getSavedOrders = async () => {
  return cachedGet('/forms/orders');
};

export const getSavedTransports = async () => {
  return cachedGet('/forms/transports');
};

export const getSavedHarbingers = async () => {
  return cachedGet('/forms/harbingers');
};

// ============================================
// DRIVER OFFER
// ============================================

export const offerForDriver = async (driverId, orderId, priceUzs) => {
  const response = await apiClient.post('/offer_for_driver', {
    driver_id: driverId,
    order_id: orderId,
    priceUzs: priceUzs,
  });
  trackDriverOfferSent(driverId, orderId);
  return response.data;
};

export const getSuitableTransports = async (filters = {}) => {
  const params = {
    ...(filters.fromCountry && { from_country: filters.fromCountry }),
    ...(filters.fromRegion && { from_region: filters.fromRegion }),
    ...(filters.fromCity && { from_city: filters.fromCity }),
    ...(filters.vehicleType && { vehicle_type: filters.vehicleType }),
    ...(filters.maxWeight && { max_weight: filters.maxWeight }),
    ...(filters.page !== undefined && { page: filters.page }),
  };

  return cachedGet('/suitable/transports', params, { skipCache: true });
};

// ============================================
// CARGO OWNER NEED PROFILE
// ============================================

export const getCargoOwnerNeedProfile = async () => {
  return cachedGet('/cargo-owner/need-profile', {}, { skipCache: true });
};

export const updateCargoOwnerNeedProfile = async (payload) => {
  const response = await apiClient.put('/cargo-owner/need-profile', payload);
  apiCache.invalidate('cargo-owner');
  return response.data;
};

export const getCargoOwnerNeedProfileTransports = async (page = 0) => {
  return cachedGet('/cargo-owner/need-profile/suitable-transports', { page }, { skipCache: true });
};

// ============================================
// MY INVITED DRIVERS (for logist role)
// ============================================

export const getMyInvitedUsers = async () => {
  return cachedGet('/my/invited/users', {}, { skipCache: true });
};

/**
 * Add invited user (driver) by phone number
 * @param {string} phone - Phone number of the driver to invite
 */
export const addInvitedUser = async (payload) => {
  const body = typeof payload === 'string' ? { phone: payload } : payload;
  const response = await apiClient.post('/add/invited/user', body);
  apiCache.invalidate('invited-users');
  trackDriverInvite();
  return response.data;
};

/**
 * Update counterparty driver status (activate/deactivate)
 * @param {number|string} driverId - Driver chat ID or pending user ID
 * @param {boolean} status - true = activate, false = deactivate
 */
export const updateCounterpartyDriverStatus = async (driverId, status) => {
  const response = await apiClient.post('/update/counterparty/driver/status', null, {
    params: {
      driverId: driverId,
      status: status
    }
  });
  apiCache.invalidate('invited-users');
  return response.data;
};

/**
 * Create transport for counterparty driver
 * @param {number|string} driverId - Driver chat ID or pending user ID
 * @param {object} transportData - Transport data
 */
export const createCounterpartyTransport = async (driverId, transportData) => {
  const response = await apiClient.post('/create/counterparty/transport', transportData, {
    params: { driverId }
  });
  apiCache.invalidate('invited-users');
  return response.data;
};

/**
 * Update counterparty's transport
 * @param {string} id - Transport ID
 * @param {number|string} driverId - Driver chat ID or pending user ID
 * @param {object} transportData - Transport data
 */
export const updateCounterpartyTransport = async (id, driverId, transportData) => {
  const response = await apiClient.put(`/update/counterparty/transport/${id}`, transportData, {
    params: { driverId }
  });
  apiCache.invalidate('invited-users');
  return response.data;
};

/**
 * Update counterparty's transport form
 * @param {string} id - Transport form ID
 * @param {number|string} driverId - Driver chat ID or pending user ID
 * @param {object} transportData - Transport data
 */
export const updateCounterpartyTransportForm = async (id, driverId, transportData) => {
  const response = await apiClient.put(`/update/counterparty/transportForm/${id}`, transportData, {
    params: { driverId }
  });
  apiCache.invalidate('invited-users');
  return response.data;
};

// ============================================
// USER PROFILE
// ============================================

export const updateUser = async (userData) => {
  const response = await apiClient.post('/user/update', userData);
  apiCache.invalidate('user');
  trackProfileUpdate();
  return response.data;
};

// ============================================
// USERBOT & BROADCAST
// ============================================

/**
 * Broadcast message to groups via userbots
 * @param {string} message - Message text to broadcast
 * @param {string[]|null} userbotPhones - Optional specific userbot phones
 */
export const broadcastMessage = async (message, userbotPhones = null) => {
  const body = { message };
  if (userbotPhones) body.userbot_phones = userbotPhones;
  const response = await apiClient.post('/api/userbot/broadcast', body);
  return response.data;
};

/**
 * Get broadcast status by ID
 * @param {string} broadcastId - Broadcast ID
 */
export const getBroadcastStatus = async (broadcastId) => {
  const response = await apiClient.get(`/api/userbot/broadcast-status/${broadcastId}`);
  return response.data;
};

/**
 * List all userbots (admin only)
 */
export const listUserbots = async () => {
  const response = await apiClient.get('/api/userbot/list');
  return response.data;
};

/**
 * Check userbots status (admin only)
 * @param {string[]} phones - List of phone numbers
 */
export const checkUserbotStatus = async (phones) => {
  const response = await apiClient.post('/api/userbot/check-status', { phones });
  return response.data;
};

/**
 * Add new userbot (admin only)
 * @param {string} phone - Phone number
 * @param {number} apiId - Telegram API ID
 * @param {string} apiHash - Telegram API Hash
 */
export const addUserbot = async (phone, apiId, apiHash) => {
  const response = await apiClient.post('/api/userbot/add', {
    phone,
    api_id: apiId,
    api_hash: apiHash
  });
  return response.data;
};

/**
 * Verify userbot code (admin only)
 * @param {string} phone - Phone number
 * @param {string} code - Verification code
 */
export const verifyUserbotCode = async (phone, code) => {
  const response = await apiClient.post('/api/userbot/verify-code', { phone, code });
  return response.data;
};

/**
 * Verify userbot password (admin only)
 * @param {string} phone - Phone number
 * @param {string} password - 2FA password
 */
export const verifyUserbotPassword = async (phone, password) => {
  const response = await apiClient.post('/api/userbot/verify-password', { phone, password });
  return response.data;
};

/**
 * Remove userbot (admin only)
 * @param {string} phone - Phone number to remove
 */
export const removeUserbot = async (phone) => {
  const response = await apiClient.delete(`/api/userbot/remove/${phone}`);
  return response.data;
};

/**
 * Get banned groups list (admin only)
 * @param {string|null} phone - Optional phone to filter
 */
export const getBannedGroups = async (phone = null) => {
  const url = phone
    ? `/api/userbot/banned-groups?phone=${phone}`
    : '/api/userbot/banned-groups';
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * Clear banned groups (admin only)
 * @param {string|null} phone - Optional phone to filter
 */
export const clearBannedGroups = async (phone = null) => {
  const url = phone
    ? `/api/userbot/banned-groups?phone=${phone}`
    : '/api/userbot/banned-groups';
  const response = await apiClient.delete(url);
  return response.data;
};

/**
 * Get group monitoring statistics (admin only)
 */
export const getGroupMonitoringStats = async () => {
  const response = await apiClient.get('/api/userbot/group-monitoring/stats');
  return response.data;
};

/**
 * Get userbot service health status (admin only)
 */
export const getUserbotHealth = async () => {
  const response = await apiClient.get('/api/userbot/health');
  return response.data;
};

// ============================================
// ADMIN: DRIVERS
// ============================================

export const adminCreateDriver = async ({ phone, name, language = 'uz', type = 'driver' }) => {
  const response = await apiClient.post('/admin/drivers', { phone, name, language, type });
  return response.data;
};

export const adminListDrivers = async (params = {}, signal) => {
  const queryParams = {};
  if (params.filter && params.filter !== 'all') queryParams.filter = params.filter;
  if (params.phone) queryParams.phone = params.phone;
  if (params.name) queryParams.name = params.name;
  if (params.onlyMine) queryParams.onlyMine = 'true';
  if (params.role) queryParams.role = params.role;
  if (params.subscriptionFilter && params.subscriptionFilter !== 'all') queryParams.subscriptionFilter = params.subscriptionFilter;
  if (params.tariffId) queryParams.tariffId = params.tariffId;
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.size !== undefined) queryParams.size = params.size;
  const response = await apiClient.get('/admin/drivers', { params: queryParams, signal });
  return response.data;
};

export const adminListUsers = async (params = {}, signal) => {
  const queryParams = {};
  if (params.filter && params.filter !== 'all') queryParams.filter = params.filter;
  if (params.phone) queryParams.phone = params.phone;
  if (params.name) queryParams.name = params.name;
  if (params.onlyMine) queryParams.onlyMine = 'true';
  queryParams.role = params.role || 'any';
  if (params.subscriptionFilter && params.subscriptionFilter !== 'all') queryParams.subscriptionFilter = params.subscriptionFilter;
  if (params.tariffId) queryParams.tariffId = params.tariffId;
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.size !== undefined) queryParams.size = params.size;
  const response = await apiClient.get('/admin/users', { params: queryParams, signal });
  return response.data;
};

export const adminUpdateUser = async (id, payload) => {
  const response = await apiClient.put(`/admin/users/${id}`, payload);
  return response.data;
};

export const adminUpdateUserRole = async (id, type) => {
  const response = await apiClient.put(`/admin/users/${id}/role`, { type });
  return response.data;
};

export const adminGetDriver = async (id) => {
  const response = await apiClient.get(`/admin/drivers/${id}`);
  return response.data;
};

export const adminDeleteDriver = async (id) => {
  const response = await apiClient.delete(`/admin/drivers/${id}`);
  return response.data;
};

export const adminCreateHarbingerForDriver = async (driverId, harbinger) => {
  const response = await apiClient.post(`/admin/drivers/${driverId}/harbingers`, harbinger);
  return response.data;
};

export const adminCreateTransportForDriver = async (driverId, transport) => {
  const response = await apiClient.post(`/admin/drivers/${driverId}/transports`, transport);
  return response.data;
};

export const adminCreateOrderForOwner = async (userId, order) => {
  const response = await apiClient.post(`/admin/users/${userId}/orders`, order);
  apiCache.invalidate('orders');
  return response.data;
};

export const adminGetCargoOwnerNeedProfile = async (userId) => {
  const response = await apiClient.get(`/admin/users/${userId}/cargo-owner-need-profile`);
  return response.data;
};

export const adminUpdateCargoOwnerNeedProfile = async (userId, payload) => {
  const response = await apiClient.put(`/admin/users/${userId}/cargo-owner-need-profile`, payload);
  return response.data;
};

export const adminGetDriverOffers = async (driverId) => {
  const response = await apiClient.get(`/admin/drivers/${driverId}/offers`);
  return response.data;
};

export const adminGetOrderOffers = async (orderId) => {
  const response = await apiClient.get(`/admin/orders/${orderId}/offers`);
  return response.data;
};

export const adminAcceptOrderForDriver = async (orderId, driverId) => {
  const response = await apiClient.post(`/admin/orders/${orderId}/accept`, null, {
    params: { driverId },
  });
  return response.data;
};

export const adminGetSettings = async () => {
  const response = await apiClient.get('/admin/settings');
  return response.data;
};

export const adminUpdateSettings = async (payload) => {
  const response = await apiClient.put('/admin/settings', payload);
  return response.data;
};

export const adminSendGroupAnnouncementNow = async (pin = false) => {
  const response = await apiClient.post('/admin/settings/group-announcer/send-now', null, {
    params: { pin: pin ? 'true' : 'false' },
  });
  return response.data;
};

export const adminUploadMedia = async (file, type = 'PHOTO') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  const response = await apiClient.post('/admin/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return response.data;
};

export const adminListPremiumOrders = async (params = {}) => {
  const response = await apiClient.get('/admin/premium-orders', { params });
  return response.data;
};

export const adminDeletePremiumOrders = async (payload) => {
  const response = await apiClient.post('/admin/premium-orders/delete', payload);
  return response.data;
};

export const adminBlockPremiumOrderChat = async (chatId, reason = 'admin manual block') => {
  const response = await apiClient.post(`/admin/premium-orders/${chatId}/block`, { reason });
  return response.data;
};

export const adminUnblockPremiumOrderChat = async (chatId) => {
  const response = await apiClient.post(`/admin/premium-orders/${chatId}/unblock`);
  return response.data;
};

export const adminGetTariffFreeLimits = async () => {
  const response = await apiClient.get('/admin/tariffs/free-limits');
  return response.data;
};

export const adminUpdateTariffFreeLimits = async (payload) => {
  const response = await apiClient.put('/admin/tariffs/free-limits', payload);
  return response.data;
};

export const adminListScheduledBroadcasts = async () => {
  const response = await apiClient.get('/admin/scheduled-broadcasts');
  return response.data;
};

export const adminCreateScheduledBroadcast = async (payload) => {
  const response = await apiClient.post('/admin/scheduled-broadcasts', payload);
  return response.data;
};

export const adminUpdateScheduledBroadcast = async (id, payload) => {
  const response = await apiClient.put(`/admin/scheduled-broadcasts/${id}`, payload);
  return response.data;
};

export const adminDeleteScheduledBroadcast = async (id) => {
  const response = await apiClient.delete(`/admin/scheduled-broadcasts/${id}`);
  return response.data;
};

export const adminDuplicateScheduledBroadcast = async (id) => {
  const response = await apiClient.post(`/admin/scheduled-broadcasts/${id}/duplicate`);
  return response.data;
};

export const adminSendScheduledBroadcastTest = async (id) => {
  const response = await apiClient.post(`/admin/scheduled-broadcasts/${id}/send-test`);
  return response.data;
};

export const adminListTariffFeatures = async () => {
  const response = await apiClient.get('/admin/tariffs/features');
  return response.data;
};

export const adminListTariffs = async (includeInactive = true) => {
  const response = await apiClient.get('/admin/tariffs', {
    params: { includeInactive: includeInactive ? 'true' : 'false' },
  });
  return response.data;
};

export const adminCreateTariff = async (payload) => {
  const response = await apiClient.post('/admin/tariffs', payload);
  return response.data;
};

export const adminUpdateTariff = async (id, payload) => {
  const response = await apiClient.put(`/admin/tariffs/${id}`, payload);
  return response.data;
};

export const adminDeleteTariff = async (id) => {
  const response = await apiClient.delete(`/admin/tariffs/${id}`);
  return response.data;
};

export const adminAssignUserTariff = async (userId, payload) => {
  const response = await apiClient.post(`/admin/users/${userId}/subscription`, payload);
  return response.data;
};

export const adminCancelUserTariff = async (userId) => {
  const response = await apiClient.delete(`/admin/users/${userId}/subscription`);
  return response.data;
};

// ============================================
// UTILITY
// ============================================

/**
 * Clear all API cache
 */
export const clearCache = () => {
  apiCache.clear();
};

/**
 * Export apiClient for advanced usage
 */
export { apiClient };
