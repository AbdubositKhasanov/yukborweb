/**
 * Order status mapping utility
 * Maps backend order statuses to Uzbek language
 */

const ORDER_STATUS_MAP = {
  'created': 'Yangi',
  'searching': 'Haydovchi qidirilmoqda',
  'appointed': 'Haydovchi biriktirildi',
  'completed': 'Yakunlangan',
  'cancelled': 'Bekor qilingan',
  'active': 'Faol',
  'new': 'Yangi'
};

/**
 * Get Uzbek translation for order status
 * @param {string} status - Backend status code
 * @returns {string} Uzbek status text
 */
export const getOrderStatusText = (status) => {
  if (!status) return '';
  return ORDER_STATUS_MAP[status] || status;
};

/**
 * Get CSS class for order status badge
 * @param {string} status - Backend status code
 * @returns {string} CSS class name
 */
export const getOrderStatusClass = (status) => {
  if (!status) return 'badge-secondary';
  
  switch (status) {
    case 'created':
    case 'searching':
    case 'active':
    case 'new':
      return 'badge-success';
    
    case 'appointed':
      return 'badge-primary';
    
    case 'completed':
      return 'badge-warning';
    
    case 'cancelled':
      return 'badge-danger';
    
    default:
      return 'badge-secondary';
  }
};

/**
 * Check if order has appointed driver
 * @param {string} status - Backend status code
 * @returns {boolean}
 */
export const hasAppointedDriver = (status) => {
  return status === 'appointed';
};
