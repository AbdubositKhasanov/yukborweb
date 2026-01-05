export const handlePhoneAccess = async (apiFunction, id) => {
  try {
    const response = await apiFunction(id);
    
    if (response.code === 200) {
      const phone = response.result?.phone || response.result?.additionalPhone;
      
      if (!phone || phone.trim() === '') {
        return {
          type: 'premium_required',
          message: 'Telefon raqamni ko\'rish uchun Premium xizmatni faollashtiring'
        };
      }
      
      return {
        type: 'success',
        phone: phone
      };
    }
    
    return {
      type: 'error',
      message: response.message || 'Xatolik yuz berdi'
    };
  } catch (err) {
    if (err.response?.status === 401) {
      return {
        type: 'unauthorized',
        message: 'Telefon raqamni ko\'rish uchun tizimga kiring'
      };
    }
    
    return {
      type: 'error',
      message: err.response?.data?.message || 'Xatolik yuz berdi'
    };
  }
};
