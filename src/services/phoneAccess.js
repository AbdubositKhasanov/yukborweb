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
      
      return {
        success: true,
        phone: phone || null,
        isPremium: !!phone,
      };
    } else {
      showError(response.message || 'Telefon raqamni olishda xatolik');
      return {
        success: false,
        isPremium: false,
      };
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Xatolik yuz berdi';
    showError(errorMessage);
    return {
      success: false,
      isPremium: false,
    };
  }
};
