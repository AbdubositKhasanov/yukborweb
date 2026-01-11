import toast from 'react-hot-toast';

const toastConfig = {
  duration: 3000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#28a745',
      color: '#fff',
    },
    icon: '✓',
    ...options,
  });
};

export const showError = (message, options = {}) => {
  return toast.error(message, {
    ...toastConfig,
    duration: 4000,
    style: {
      ...toastConfig.style,
      background: '#dc3545',
      color: '#fff',
    },
    icon: '✕',
    ...options,
  });
};

export const showInfo = (message, options = {}) => {
  return toast(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#17a2b8',
      color: '#fff',
    },
    icon: 'ℹ',
    ...options,
  });
};

export const showLoading = (message = 'Yuklanmoqda...', options = {}) => {
  return toast.loading(message, {
    ...toastConfig,
    duration: Infinity,
    ...options,
  });
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const showPromise = (promise, messages) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Yuklanmoqda...',
      success: messages.success || 'Muvaffaqiyatli!',
      error: messages.error || 'Xatolik yuz berdi',
    },
    toastConfig
  );
};
