import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for debouncing values (useful for search inputs)
 * @param {*} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} Debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for making API calls with loading and error states
 * @param {Function} apiFunc - API function to call
 * @returns {Object} { data, loading, error, execute, reset }
 */
export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunc(...args);
        setData(result);
        return result;
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

/**
 * Hook for handling localStorage with JSON serialization
 * @param {string} key - localStorage key
 * @param {*} initialValue - Initial value
 * @returns {[*, Function]} [storedValue, setValue]
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};

/**
 * Hook for detecting click outside of element
 * @param {Function} callback - Callback to execute when clicked outside
 * @returns {React.RefObject} Ref to attach to element
 */
export const useClickOutside = (callback) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [callback]);

  return ref;
};

/**
 * Hook for pagination
 * @param {number} initialPage - Initial page number
 * @param {number} pageSize - Items per page
 * @returns {Object} { page, nextPage, prevPage, resetPage, canGoNext, canGoPrev }
 */
export const usePagination = (initialPage = 0, pageSize = 10) => {
  const [page, setPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const resetPage = useCallback(() => {
    setPage(0);
  }, []);

  const canGoNext = totalItems > (page + 1) * pageSize;
  const canGoPrev = page > 0;

  return {
    page,
    setPage,
    nextPage,
    prevPage,
    resetPage,
    canGoNext,
    canGoPrev,
    totalItems,
    setTotalItems,
  };
};

/**
 * Hook for form state management
 * @param {Object} initialValues - Initial form values
 * @returns {Object} { values, errors, handleChange, handleSubmit, setErrors, reset }
 */
export const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field when user starts typing
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const handleSubmit = useCallback(
    (onSubmit) => async (e) => {
      e.preventDefault();
      setErrors({});

      try {
        await onSubmit(values);
      } catch (error) {
        if (error.validationErrors) {
          setErrors(error.validationErrors);
        }
      }
    },
    [values]
  );

  return {
    values,
    errors,
    handleChange,
    handleSubmit,
    setErrors,
    reset,
    setValues,
  };
};

/**
 * Hook for media queries
 * @param {string} query - Media query string
 * @returns {boolean} Whether the media query matches
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (e) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

/**
 * Hook for managing authentication state
 * @returns {Object} { user, token, isAuthenticated, login, logout, loading }
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useLocalStorage('authToken', null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate token and fetch user data on mount
    const validateToken = async () => {
      if (token) {
        try {
          // TODO: Fetch user data from API
          // const userData = await getUserMe();
          // setUser(userData);
        } catch (error) {
          console.error('Token validation failed:', error);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const login = useCallback(
    (newToken, userData) => {
      setToken(newToken);
      setUser(userData);
    },
    [setToken]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('userData');
  }, [setToken]);

  return {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    loading,
  };
};
