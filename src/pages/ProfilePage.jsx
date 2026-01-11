import React, { useState, useEffect } from 'react';
import { updateUser, getInfo, getUserMe } from '../services/api';
import { formatBalance, getBalanceColor } from '../utils/formatBalance';
import { getTelegramSupportUrl } from '../config/config';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState(null);
  const [userData, setUserData] = useState(null);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('uz');
  const [type, setType] = useState('not_selected');
  const [gender, setGender] = useState('not_selected');

  useEffect(() => {
    // OPTIMIZED: Load both APIs in parallel
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    try {
      // Load stats and user data in parallel
      const [statsResponse, userResponse] = await Promise.all([
        getInfo(),
        getUserMe()
      ]);

      // Set stats
      if (statsResponse.code === 200) {
        setStats(statsResponse.result);
      }

      // Set user data
      if (userResponse.code === 200 && userResponse.result) {
        const user = userResponse.result;
        setUserData(user);
        setPhone(user.phone || '');
        setName(user.name || '');
        setLanguage(user.language || 'uz');
        setType(user.type || 'not_selected');
        setGender(user.gender || 'not_selected');
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedData = {
        phone,
        name,
        language,
        type,
        gender
      };

      const response = await updateUser(updatedData);
      if (response.code === 200) {
        setSuccess(true);
        // OPTIMIZED: Update only user data without full reload
        const userResponse = await getUserMe();
        if (userResponse.code === 200 && userResponse.result) {
          setUserData(userResponse.result);
        }
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.message || 'Profilni yangilashda xatolik');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Profil</h1>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px', 
        maxWidth: '1000px', 
        margin: '0 auto' 
      }}>
        {/* User Info Card */}
        <div className="card">
          <h3 className="card-title">Mening ma'lumotlarim</h3>
          {loading ? (
            <div className="loading" style={{ padding: '20px' }}>Yuklanmoqda...</div>
          ) : userData ? (
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '2' }}>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <span>Chat ID:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{userData.chatId}</strong>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <span>Telefon:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{userData.phone || 'Ko\'rsatilmagan'}</strong>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <span>Ism:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{userData.name || 'Ko\'rsatilmagan'}</strong>
              </p>
              
              {/* YANGI: Balans bloki - har doim ko'rsatiladi */}
              <div style={{
                margin: '10px 0',
                padding: '20px',
                backgroundColor: (userData.balance ?? 0) > 0 ? '#d4edda' : '#fff3cd',
                borderRadius: '12px',
                border: `2px solid ${(userData.balance ?? 0) > 0 ? '#c3e6cb' : '#ffeaa7'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                {/* Balans ma'lumoti */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      fontSize: '28px',
                      filter: 'grayscale(0%)'
                    }}>
                      {(userData.balance ?? 0) > 0 ? '💰' : '💳'}
                    </span>
                    <span style={{ 
                      fontWeight: '600', 
                      fontSize: '16px',
                      color: '#333'
                    }}>
                      Balans
                    </span>
                  </div>
                  <strong style={{ 
                    color: getBalanceColor(userData.balance ?? 0),
                    fontSize: '22px',
                    fontWeight: 'bold'
                  }}>
                    {formatBalance(userData.balance)}
                  </strong>
                </div>
                
                {/* Balansni to'ldirish tugmasi */}
                <a
                  href={getTelegramSupportUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: 'var(--brand-color)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '15px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(8, 20, 44, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a1a38';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(8, 20, 44, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--brand-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(8, 20, 44, 0.2)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
                  }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Balansni to'ldirish</span>
                  <span style={{ fontSize: '18px' }}>💳</span>
                </a>
              </div>
              
              {userData.driverLastLocName && (
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                  <span>🚚 Haydovchi joylashuvi:</span>
                  <strong style={{ color: '#155724' }}>{userData.driverLastLocName}</strong>
                </p>
              )}
              {userData.driverCurrentStatus !== undefined && (
                <p style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  margin: '10px 0', 
                  padding: '10px', 
                  backgroundColor: userData.driverCurrentStatus ? '#d4edda' : '#f8d7da', 
                  borderRadius: '4px' 
                }}>
                  <span>Status:</span>
                  <strong style={{ color: userData.driverCurrentStatus ? '#155724' : '#721c24' }}>
                    {userData.driverCurrentStatus ? '✓ Faol' : '⏸ Nofaol'}
                  </strong>
                </p>
              )}
              {userData.time && (
                <p style={{ margin: '10px 0', fontSize: '12px', color: '#999' }}>
                  Ro'yxatdan o'tgan: {new Date(userData.time).toLocaleDateString('uz-UZ')}
                </p>
              )}
            </div>
          ) : (
            <div className="error-message">Ma'lumotlarni yuklab bo'lmadi</div>
          )}
        </div>

        {/* Stats Card */}
        <div className="card">
          <h3 className="card-title">Platforma statistikasi</h3>
          {stats ? (
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '2' }}>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                <span>Jami yuklar:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{stats.allOrdersCount}</strong>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                <span>So'nggi 24 soat:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{stats.last24HourOrdersCount}</strong>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                <span>Premium yuklar:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{stats.premiumOrdersCount}</strong>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                <span>Jami transportlar:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{stats.allTransportsCount}</strong>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                <span>Jami harbingerlar:</span>
                <strong style={{ color: 'var(--brand-color)' }}>{stats.allHarbingersCount}</strong>
              </p>
            </div>
          ) : (
            <div className="loading" style={{ padding: '20px' }}>Yuklanmoqda...</div>
          )}
        </div>
      </div>

      {/* Profile Update Form */}
      <div className="card" style={{ maxWidth: '600px', margin: '30px auto 0' }}>
        <h3 className="card-title">Profilni tahrirlash</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Telefon raqam</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ism</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="To'liq ismingiz"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Til</label>
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="uz">O'zbek</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Faoliyat turi</label>
            <select
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="not_selected">Tanlanmagan</option>
              <option value="logist">Logist</option>
              <option value="driver">Haydovchi</option>
              <option value="factory">Zavod</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Jins</label>
            <select
              className="form-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="not_selected">Tanlanmagan</option>
              <option value="male">Erkak</option>
              <option value="female">Ayol</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Profil yangilandi!</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || loading}
            style={{ width: '100%', marginTop: '10px' }}
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      </div>
    </div>
  );
}
