import axios from 'axios';
import CryptoJS from 'crypto-js';
import { showError } from '../utils/toast';

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
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;

        case 403:
          showError('Sizda bu amalni bajarish uchun ruxsat yo\'q');
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
          showError(data?.message || 'Xatolik yuz berdi');
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
    setAuthToken(response.data.result);
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

export const searchCargos = async (filters = {}) => {
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
    ...(filters.page !== undefined && { page: filters.page }),
  };

  return cachedGet('/cargos', params);
};

export const searchTransports = async (filters = {}) => {
  const params = {
    ...(filters.fromCountry && { from_country: filters.fromCountry }),
    ...(filters.fromRegion && { from_region: filters.fromRegion }),
    ...(filters.fromCity && { from_city: filters.fromCity }),
    ...(filters.vehicleType && { vehicle_type: filters.vehicleType }),
    ...(filters.maxWeight && { max_weight: filters.maxWeight }),
    ...(filters.page !== undefined && { page: filters.page }),
  };

  return cachedGet('/transports', params);
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

// ============================================
// CARGO DETAILS
// ============================================

export const getCargoDetails = async (id) => {
  return cachedGet(`/cargo/${id}`, {}, { skipCache: true }); // Always fresh
};

export const requestCargoPhone = async (id) => {
  // Don't cache phone requests
  const response = await apiClient.get(`/cargo/${id}`);
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
  // Invalidate orders cache
  apiCache.invalidate('orders');
  return response.data;
};

export const updateOrder = async (id, orderData) => {
  const response = await apiClient.put(`/update/order/${id}`, orderData);
  apiCache.invalidate('orders');
  return response.data;
};

export const deleteOrder = async (id) => {
  const response = await apiClient.delete(`/order/${id}`);
  apiCache.invalidate('orders');
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
  return response.data;
};

export const updateTransport = async (id, transportData) => {
  const response = await apiClient.put(`/update/transport/${id}`, transportData);
  apiCache.invalidate('transports');
  return response.data;
};

export const deleteTransport = async (id) => {
  const response = await apiClient.delete(`/transport/${id}`);
  apiCache.invalidate('transports');
  return response.data;
};

// ============================================
// DRIVER STATUS & TRANSPORT FORM
// ============================================

export const updateDriverStatus = async (isActive) => {
  const response = await apiClient.post('/update/driver/status', isActive);
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
  return response.data;
};

export const updateHarbinger = async (id, harbingerData) => {
  const response = await apiClient.put(`/update/harbinger/${id}`, harbingerData);
  apiCache.invalidate('harbingers');
  return response.data;
};

export const deleteHarbinger = async (id) => {
  const response = await apiClient.delete(`/harbinger/${id}`);
  apiCache.invalidate('harbingers');
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

export const offerForDriver = async (driverId, orderId) => {
  const response = await apiClient.post('/offer_for_driver', {
    driver_id: driverId,
    order_id: orderId,
  });
  return response.data;
};

// ============================================
// USER PROFILE
// ============================================

export const updateUser = async (userData) => {
  const response = await apiClient.post('/user/update', userData);
  apiCache.invalidate('user');
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
