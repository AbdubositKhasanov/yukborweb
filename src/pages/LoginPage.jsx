import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramLoginUrl } from '../config/config';
import { login } from '../services/api';
import { trackLogin } from '../services/analytics';

export default function LoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCodeInput, setShowCodeInput] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect to home
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleTelegramLogin = () => {
    // Yangi tabda ochish — user sahifani yo'qotmasin
    const telegramUrl = getTelegramLoginUrl();
    window.open(telegramUrl, '_blank');
    setShowCodeInput(true);
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Iltimos, kodni kiriting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await login(code);
      
      if (response.code === 200 && response.result.token) {
        // Save token
        localStorage.setItem('authToken', response.result.token);
        trackLogin('telegram', 'unknown');

        // Reload the page to refresh app state
        window.location.href = '/';
      } else {
        setError(response.message || 'Kod noto\'g\'ri yoki muddati o\'tgan');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi. Qaytadan urinib ko\'ring');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{
        maxWidth: '500px',
        margin: '60px auto',
      }}>
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '32px', 
              color: 'var(--brand-color)',
              marginBottom: '15px'
            }}>
              Xush kelibsiz!
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: '#666',
              lineHeight: '1.6'
            }}>
              Platformaga kirish uchun avval Telegram botidan kod oling
            </p>
          </div>

          {!showCodeInput ? (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleTelegramLogin}
                style={{ 
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginBottom: '20px'
                }}
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.03-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.943.11.78.89z"/>
                </svg>
                1. Telegram botiga o'tish va kod olish
              </button>

              <button
                className="btn btn-success"
                onClick={() => setShowCodeInput(true)}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px'
                }}
              >
                2. Kod oldim, kirish
              </button>

              <div style={{ 
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  💡 <strong>Qanday ishlaydi:</strong><br/>
                  1. "Telegram botiga o'tish" tugmasini bosing<br/>
                  2. Botdan kirish kodini oling<br/>
                  3. Bu sahifaga qaytib, kodni kiriting
                </p>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleCodeSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    Telegram botdan olgan kodingizni kiriting
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(null); }}
                    placeholder="Masalan: 123456"
                    disabled={loading}
                    autoFocus
                    style={{
                      fontSize: '18px',
                      textAlign: 'center',
                      letterSpacing: '3px'
                    }}
                  />
                </div>

                {error && (
                  <div className="error-message" style={{ marginBottom: '20px' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCodeInput(false);
                      setCode('');
                      setError(null);
                    }}
                    style={{ flex: 1 }}
                  >
                    Ortga
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !code.trim()}
                    style={{ flex: 2 }}
                  >
                    {loading ? 'Tekshirilmoqda...' : 'Kirish'}
                  </button>
                </div>
              </form>

              <div style={{
                marginTop: '20px',
                textAlign: 'center'
              }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleTelegramLogin}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-color)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '8px'
                  }}
                >
                  Yangi kod olish
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
