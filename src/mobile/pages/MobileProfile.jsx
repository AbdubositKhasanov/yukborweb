/**
 * Mobile Profile Page
 * Tabbed layout: Info | Edit | Stats
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserMe, updateUser, getInfo } from '../../services/api';
import { formatBalance, getBalanceColor } from '../../utils/formatBalance';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import MobileLoading from '../components/MobileLoading';

const TABS = ['Ma\'lumot', 'Tahrirlash', 'Statistika'];

// Helper to get default page by role
// Roles: driver, factory, logist (default)
const getDefaultPageByRole = (userType) => {
  const type = userType?.toLowerCase() || '';
  if (type === 'driver' || type === 'haydovchi') {
    return '/mobile/status'; // Haydovchi holati
  }
  if (type === 'factory' || type === 'zavod') {
    return '/mobile/orders'; // Buyurtmalarim
  }
  return '/mobile'; // Yuklar (logist default)
};

export default function MobileProfile() {
  const navigate = useNavigate();
  const { logout, refreshUser, userRole } = useMobileAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form - MUST match Desktop ProfilePage.jsx field names
  const [editData, setEditData] = useState({
    phone: '',
    name: '',
    language: 'uz',
    type: 'not_selected',
    gender: 'not_selected',
  });
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userResponse, infoResponse] = await Promise.all([
        getUserMe(),
        getInfo(),
      ]);

      if (userResponse.code === 200) {
        const u = userResponse.result;
        setUser(u);
        // MUST match Desktop ProfilePage.jsx field names
        setEditData({
          phone: u.phone || '',
          name: u.name || '',
          language: u.language || 'uz',
          type: u.type || 'not_selected',
          gender: u.gender || 'not_selected',
        });
      }

      if (infoResponse.code === 200) {
        setStats(infoResponse.result);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setEditError('');

      const oldType = user?.type;

      // MUST match Desktop ProfilePage.jsx payload EXACTLY
      const response = await updateUser({
        phone: editData.phone,
        name: editData.name,
        language: editData.language,
        type: editData.type,
        gender: editData.gender,
      });

      if (response.code === 200) {
        await refreshUser();
        await loadData();

        // If role changed, navigate to the new role's default page
        if (oldType !== editData.type) {
          const newDefaultPage = getDefaultPageByRole(editData.type);
          console.log('[MobileProfile] Role changed from', oldType, 'to', editData.type, '-> navigating to', newDefaultPage);
          navigate(newDefaultPage, { replace: true });
        } else {
          setActiveTab(0); // Switch to info tab
        }
      } else {
        setEditError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setEditError('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/mobile/login');
  };

  const handleTopUp = () => {
    window.open('https://t.me/yukborsupport', '_blank');
  };

  if (loading) {
    return (
      <>
        <TopBar title="Profil" />
        <MobileLoading fullScreen />
      </>
    );
  }

  const balance = user?.balance ?? 0;

  return (
    <>
      <TopBar title="Profil" />

      <main className="m-content">
        {/* Tab bar */}
        <div className="m-segmented" style={{ margin: 16 }}>
          {TABS.map((tab, index) => (
            <button
              key={tab}
              className={`m-segmented-btn ${activeTab === index ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '0 16px 24px' }}>
          {/* Info tab - MUST use Desktop field names */}
          {activeTab === 0 && (
            <>
              <div className="m-info-card" style={{ margin: 0 }}>
                <div className="m-info-card-row">
                  <span className="m-info-card-label">🆔 Chat ID</span>
                  <span className="m-info-card-value">
                    {user?.chatId || '-'}
                  </span>
                </div>
                <div className="m-info-card-row">
                  <span className="m-info-card-label">👤 Ism</span>
                  <span className="m-info-card-value">
                    {user?.name || 'Ko\'rsatilmagan'}
                  </span>
                </div>
                <div className="m-info-card-row">
                  <span className="m-info-card-label">📞 Telefon</span>
                  <span className="m-info-card-value">
                    {user?.phone || 'Ko\'rsatilmagan'}
                  </span>
                </div>
                {user?.driverLastLocName && (
                  <div className="m-info-card-row" style={{ background: '#d4edda' }}>
                    <span className="m-info-card-label">🚚 Haydovchi joylashuvi</span>
                    <span className="m-info-card-value" style={{ color: '#155724' }}>
                      {user.driverLastLocName}
                    </span>
                  </div>
                )}
                {user?.driverCurrentStatus !== undefined && (
                  <div className="m-info-card-row" style={{ background: user.driverCurrentStatus ? '#d4edda' : '#f8d7da' }}>
                    <span className="m-info-card-label">Status</span>
                    <span className="m-info-card-value" style={{ color: user.driverCurrentStatus ? '#155724' : '#721c24' }}>
                      {user.driverCurrentStatus ? '✓ Faol' : '⏸ Nofaol'}
                    </span>
                  </div>
                )}
                <div className="m-info-card-row">
                  <span className="m-info-card-label">📅 Ro'yxatdan</span>
                  <span className="m-info-card-value">
                    {user?.time ? new Date(user.time).toLocaleDateString('uz-UZ') : '-'}
                  </span>
                </div>
                <div className="m-info-card-row" style={{ background: '#e3f2fd' }}>
                  <span className="m-info-card-label">🎭 Faoliyat turi</span>
                  <span className="m-info-card-value" style={{ color: '#1565c0' }}>
                    {userRole === 'driver' ? '🚚 Haydovchi' :
                     userRole === 'factory' ? '🏭 Zavod' :
                     '📋 Logist'}
                  </span>
                </div>
              </div>

              {/* Balance card */}
              <div className="m-balance" style={{ marginTop: 16 }}>
                <div className="m-balance-label">Balans</div>
                <div
                  className="m-balance-amount"
                  style={{ color: getBalanceColor(balance) }}
                >
                  {formatBalance(balance)}
                </div>
                <button
                  className="m-btn m-btn-primary"
                  onClick={handleTopUp}
                  style={{ marginTop: 16 }}
                >
                  💰 Balansni to'ldirish
                </button>
              </div>

              {/* Logout */}
              <button
                className="m-btn m-btn-ghost m-btn-full"
                onClick={handleLogout}
                style={{ marginTop: 24, color: 'var(--m-danger)' }}
              >
                Chiqish
              </button>
            </>
          )}

          {/* Edit tab - MUST match Desktop form fields exactly */}
          {activeTab === 1 && (
            <>
              <div className="m-form-group">
                <label className="m-form-label">Telefon raqam</label>
                <input
                  type="tel"
                  className="m-form-input"
                  placeholder="+998 90 123 45 67"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  inputMode="tel"
                />
              </div>

              <div className="m-form-group">
                <label className="m-form-label">Ism</label>
                <input
                  type="text"
                  className="m-form-input"
                  placeholder="To'liq ismingiz"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>

              <div className="m-form-group">
                <label className="m-form-label">Til</label>
                <select
                  className="m-form-select"
                  value={editData.language}
                  onChange={(e) => setEditData({ ...editData, language: e.target.value })}
                >
                  <option value="uz">O'zbek</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="m-form-group">
                <label className="m-form-label">Faoliyat turi</label>
                <select
                  className="m-form-select"
                  value={editData.type}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                >
                  <option value="not_selected">Tanlanmagan</option>
                  <option value="logist">Logist</option>
                  <option value="driver">Haydovchi</option>
                  <option value="factory">Zavod</option>
                </select>
              </div>

              <div className="m-form-group">
                <label className="m-form-label">Jins</label>
                <select
                  className="m-form-select"
                  value={editData.gender}
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                >
                  <option value="not_selected">Tanlanmagan</option>
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                </select>
              </div>

              {editError && (
                <div style={{ padding: 12, background: '#ffebee', borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: 'var(--m-danger)', margin: 0, fontSize: 14 }}>{editError}</p>
                </div>
              )}

              <button
                className="m-btn m-btn-primary m-btn-full m-btn-lg"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </>
          )}

          {/* Stats tab - MUST use Desktop field names */}
          {activeTab === 2 && (
            <div className="m-stats-grid" style={{ padding: 0 }}>
              <div className="m-stat-card">
                <div className="m-stat-value">{stats?.allOrdersCount?.toLocaleString() || 0}</div>
                <div className="m-stat-label">Jami yuklar</div>
              </div>
              <div className="m-stat-card">
                <div className="m-stat-value">{stats?.last24HourOrdersCount || 0}</div>
                <div className="m-stat-label">24 soatda</div>
              </div>
              <div className="m-stat-card">
                <div className="m-stat-value">{stats?.allTransportsCount || 0}</div>
                <div className="m-stat-label">Transportlar</div>
              </div>
              <div className="m-stat-card">
                <div className="m-stat-value">{stats?.premiumOrdersCount || 0}</div>
                <div className="m-stat-label">Premium</div>
              </div>
              <div className="m-stat-card">
                <div className="m-stat-value">{stats?.allHarbingersCount || 0}</div>
                <div className="m-stat-label">Harbingerlar</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
