/**
 * Mobile Login Page
 * Telegram-based authentication with bottom-positioned buttons
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, getUserMe } from '../../services/api';
import { useMobileAuth } from '../context/MobileAuthContext';
import { trackLogin, setAnalyticsUserProperties } from '../../services/analytics';
import TopBar from '../components/TopBar';

const TELEGRAM_BOT_URL = 'https://t.me/yukbor_global_bot?start=login';

export default function MobileLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, refreshUser, setAuthenticated } = useMobileAuth();
  const codeInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1: get code, 2: enter code
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/mobile';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Focus code input when step changes
  useEffect(() => {
    if (step === 2 && codeInputRef.current) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [step]);

  const handleGetCode = () => {
    window.open(TELEGRAM_BOT_URL, '_blank');
    setStep(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Kodni kiriting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Clear any corrupted token before login attempt
      localStorage.removeItem('authToken');

      const response = await login(code.trim());

      if (response.code === 200) {
        // Get user data immediately after login
        const userResponse = await getUserMe();
        if (userResponse.code === 200 && userResponse.result) {
          // Set authenticated state directly to ensure navigation bar shows
          setAuthenticated(userResponse.result);

          // Redirect to role-specific default page
          // Roles: driver, factory, logist (default)
          const userData = userResponse.result;
          const role = userData.type?.toLowerCase() || 'unknown';
          trackLogin('telegram_mobile', role);
          setAnalyticsUserProperties(userData.chatId, role, userData.isInternalDispatcher);
          const userType = userData.type?.toLowerCase() || '';
          let defaultPath = '/mobile'; // logist default - Yuklar

          if (userType === 'driver' || userType === 'haydovchi') {
            defaultPath = '/mobile/status'; // Haydovchi holati
          } else if (userType === 'factory' || userType === 'zavod') {
            defaultPath = '/mobile/orders'; // Buyurtmalarim
          }

          const from = location.state?.from?.pathname || defaultPath;
          navigate(from, { replace: true });
          return;
        }

        const from = location.state?.from?.pathname || '/mobile';
        navigate(from, { replace: true });
      } else {
        setError(response.message || 'Kod noto\'g\'ri yoki eskirgan');
      }
    } catch (error) {
      // Show actual error from server - matches Desktop LoginPage.jsx
      setError(error.response?.data?.message || 'Xatolik yuz berdi. Qaytadan urinib ko\'ring');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="Kirish" />

      <main className="m-content m-content-padded" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Logo and welcome */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🚚</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--m-text)' }}>
            YukBor
          </h1>
          <p style={{ fontSize: 16, color: 'var(--m-text-secondary)', margin: 0, maxWidth: 280 }}>
            Yuk tashish platformasiga xush kelibsiz
          </p>
        </div>

        {/* Login form - positioned at bottom */}
        <div style={{ paddingBottom: 32 }}>
          {step === 1 ? (
            <>
              <button
                className="m-btn m-btn-primary m-btn-full m-btn-lg"
                onClick={handleGetCode}
              >
                📱 Telegram orqali kod olish
              </button>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--m-text-muted)', marginTop: 16 }}>
                Telegram botdan kod oling va shu yerda kiriting
              </p>
            </>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="m-form-group">
                <label className="m-form-label">Kodni kiriting</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  className={`m-form-input ${error ? 'error' : ''}`}
                  placeholder="Kod"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  autoComplete="one-time-code"
                  inputMode="text"
                  maxLength={20}
                />
                {error && <p className="m-form-error">{error}</p>}
              </div>

              <button
                type="submit"
                className="m-btn m-btn-primary m-btn-full m-btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="m-spinner" style={{ width: 20, height: 20 }} />
                    Tekshirilmoqda...
                  </>
                ) : (
                  'Kirish'
                )}
              </button>

              <button
                type="button"
                className="m-btn m-btn-ghost m-btn-full"
                onClick={handleGetCode}
                style={{ marginTop: 12 }}
              >
                Yangi kod olish
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
