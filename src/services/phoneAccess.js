import { showError } from '../utils/toast';

/**
 * Generic phone access handler
 * @param {Function} apiFunc - API function to call (requestCargoPhone or getTransportDetails)
 * @param {number} id - Cargo or Transport ID
 * @returns {Promise<{success: boolean, phone?: string, isPremium: boolean}>}
 */
export const handlePhoneAccess = async (apiFunc, id) => {
  try {
    const response = await apiFunc(id);
    
    if (response.code === 200) {
      const phone = response.result?.additionalPhone || response.result?.phone;
      const telegramUsername = response.result?.telegramUsername || null;
      const chatId = response.result?.chatId || null;
      const ownerName = response.result?.ownerName || response.result?.owner_name || null;

      if (phone) {
        return {
          success: true,
          type: 'success',
          phone,
          telegramUsername,
          chatId,
          ownerName,
          message: 'Telefon raqam:',
        };
      } else {
        return {
          success: true,
          type: 'permission_denied',
          phone: null,
          message: 'Sizda ushbu telefon raqamni ko\'rish uchun ruxsat yo\'q',
        };
      }
    } else {
      const message = response.message || 'Telefon raqamni olishda xatolik';
      showError(message);
      return {
        success: false,
        type: 'error',
        message,
      };
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Xatolik yuz berdi';
    showError(errorMessage);
    return {
      success: false,
      type: 'error',
      message: errorMessage,
    };
  }
};
