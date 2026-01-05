import axios from 'axios';
import { config } from '../config/config';

const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// ============================================
// AUTHENTICATION
// ============================================

export const login = async (code) => {
  const response = await apiClient.post('/login/mobile', { code });
  return response.data;
};

export const getUserMe = async () => {
  const response = await apiClient.get('/user/me');
  return response.data;
};

// ============================================
// SEARCH & BROWSE (CORE FEATURES)
// ============================================

export const searchCargos = async (filters = {}) => {
  const params = {};
  if (filters.fromCountry) params.from_country = filters.fromCountry;
  if (filters.fromRegion) params.from_region = filters.fromRegion;
  if (filters.fromCity) params.from_city = filters.fromCity;
  if (filters.toCountry) params.to_country = filters.toCountry;
  if (filters.toRegion) params.to_region = filters.toRegion;
  if (filters.toCity) params.to_city = filters.toCity;
  if (filters.vehicleType) params.vehicle_type = filters.vehicleType;
  if (filters.minWeight) params.min_weight = filters.minWeight;
  if (filters.maxWeight) params.max_weight = filters.maxWeight;
  if (filters.page !== undefined) params.page = filters.page;

  const response = await apiClient.get('/cargos', { params });
  return response.data;
};

export const searchTransports = async (filters = {}) => {
  const params = {};
  if (filters.fromCountry) params.from_country = filters.fromCountry;
  if (filters.fromRegion) params.from_region = filters.fromRegion;
  if (filters.fromCity) params.from_city = filters.fromCity;
  if (filters.vehicleType) params.vehicle_type = filters.vehicleType;
  if (filters.maxWeight) params.max_weight = filters.maxWeight;
  if (filters.page !== undefined) params.page = filters.page;

  const response = await apiClient.get('/transports', { params });
  return response.data;
};

// ============================================
// STATIC DATA
// ============================================

export const getLocationsAndVehicles = async () => {
  const response = await apiClient.get('/locationsAndVehicles');
  return response.data;
};

export const getInfo = async () => {
  const response = await apiClient.get('/info');
  return response.data;
};

// ============================================
// CARGO DETAILS & PHONE ACCESS (PREMIUM GATING)
// ============================================

export const getCargoDetails = async (id) => {
  const response = await apiClient.get(`/cargo/${id}`);
  return response.data;
};

export const requestCargoPhone = async (id) => {
  const response = await apiClient.get(`/cargo/${id}`);
  return response.data;
};

// ============================================
// TRANSPORT DETAILS
// ============================================

export const getTransportDetails = async (id) => {
  const response = await apiClient.get(`/transport/${id}`);
  return response.data;
};

// ============================================
// MY ORDERS
// ============================================

export const getMyOrders = async () => {
  const response = await apiClient.get('/my/orders');
  return response.data;
};

export const getMyOrder = async (id) => {
  const response = await apiClient.get(`/my/order/${id}`);
  return response.data;
};

export const createOrder = async (orderData) => {
  const response = await apiClient.post('/create/order', orderData);
  return response.data;
};

export const updateOrder = async (id, orderData) => {
  const response = await apiClient.put(`/update/order/${id}`, orderData);
  return response.data;
};

export const deleteOrder = async (id) => {
  const response = await apiClient.delete(`/order/${id}`);
  return response.data;
};

// ============================================
// MY TRANSPORTS
// ============================================

export const getMyTransports = async () => {
  const response = await apiClient.get('/my/transports');
  return response.data;
};

export const getMyTransport = async (id) => {
  const response = await apiClient.get(`/my/transport/${id}`);
  return response.data;
};

export const createTransport = async (transportData) => {
  const response = await apiClient.post('/create/transport', transportData);
  return response.data;
};

export const updateTransport = async (id, transportData) => {
  const response = await apiClient.put(`/update/transport/${id}`, transportData);
  return response.data;
};

export const deleteTransport = async (id) => {
  const response = await apiClient.delete(`/transport/${id}`);
  return response.data;
};

// ============================================
// DRIVER STATUS & TRANSPORT FORM (NEW APIS)
// ============================================

export const updateDriverStatus = async (isActive) => {
  const response = await apiClient.post('/update/driver/status', isActive);
  return response.data;
};

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
  const response = await apiClient.get('/my/harbingers');
  return response.data;
};

export const getMyHarbinger = async (id) => {
  const response = await apiClient.get(`/my/harbinger/${id}`);
  return response.data;
};

export const createHarbinger = async (harbingerData) => {
  const response = await apiClient.post('/create/harbinger', harbingerData);
  return response.data;
};

export const updateHarbinger = async (id, harbingerData) => {
  const response = await apiClient.put(`/update/harbinger/${id}`, harbingerData);
  return response.data;
};

export const deleteHarbinger = async (id) => {
  const response = await apiClient.delete(`/harbinger/${id}`);
  return response.data;
};

// ============================================
// SAVED FORMS (TEMPLATES)
// ============================================

export const getSavedOrders = async () => {
  const response = await apiClient.get('/forms/orders');
  return response.data;
};

export const getSavedTransports = async () => {
  const response = await apiClient.get('/forms/transports');
  return response.data;
};

export const getSavedHarbingers = async () => {
  const response = await apiClient.get('/forms/harbingers');
  return response.data;
};

// ============================================
// DRIVER OFFER
// ============================================

export const offerForDriver = async (driverId, orderId) => {
  const response = await apiClient.post('/offer_for_driver', {
    driver_id: driverId,
    order_id: orderId
  });
  return response.data;
};

// ============================================
// USER PROFILE (NEW API USAGE)
// ============================================

export const updateUser = async (userData) => {
  const response = await apiClient.post('/user/update', userData);
  return response.data;
};
