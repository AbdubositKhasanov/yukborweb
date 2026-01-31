import React, { useState, useEffect, useCallback } from 'react';
import {
  listUserbots,
  checkUserbotStatus,
  addUserbot,
  verifyUserbotCode,
  verifyUserbotPassword,
  removeUserbot,
  getUserMe
} from '../services/api';

export default function UserbotManagementPage() {
  const [userbots, setUserbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  // Add userbot form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [addApiId, setAddApiId] = useState('');
  const [addApiHash, setAddApiHash] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // Verification states
  const [verifyPhone, setVerifyPhone] = useState(null);
  const [verifyStep, setVerifyStep] = useState(null); // 'code', 'password'
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  // Status check
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userRes = await getUserMe();
      if (userRes.code === 200 && userRes.result) {
        setIsAdmin(userRes.result.isAdmin === true);
      }

      const res = await listUserbots();
      if (res.success) {
        setUserbots(res.userbots || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (userbots.length === 0) return;
    setCheckingStatus(true);
    try {
      const phones = userbots.map(u => u.phone);
      const res = await checkUserbotStatus(phones);
      if (res.success && res.statuses) {
        // Update userbots with fresh status
        setUserbots(prev => prev.map(ub => {
          const fresh = res.statuses.find(s => s.phone === ub.phone);
          return fresh ? { ...ub, ...fresh } : ub;
        }));
      }
    } catch (err) {
      console.error('Status check error:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleAddUserbot = async (e) => {
    e.preventDefault();
    if (!addPhone || !addApiId || !addApiHash) {
      setAddError('Barcha maydonlarni to\'ldiring');
      return;
    }

    setAddLoading(true);
    setAddError(null);

    try {
      const res = await addUserbot(addPhone, parseInt(addApiId), addApiHash);
      if (res.success && res.requires_code) {
        setVerifyPhone(addPhone);
        setVerifyStep('code');
        setShowAddForm(false);
        setAddPhone('');
        setAddApiId('');
        setAddApiHash('');
      } else if (res.success) {
        setShowAddForm(false);
        loadData();
      } else {
        setAddError(res.message || 'Xatolik');
      }
    } catch (err) {
      setAddError(err.response?.data?.message || err.message || 'Xatolik');
    } finally {
      setAddLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const res = await verifyUserbotCode(verifyPhone, verifyCode);
      if (res.success && res.is_authorized) {
        setVerifyPhone(null);
        setVerifyStep(null);
        setVerifyCode('');
        loadData();
      } else if (res.requires_password) {
        setVerifyStep('password');
        setVerifyCode('');
      } else {
        setVerifyError(res.message || 'Kod noto\'g\'ri');
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || err.message || 'Xatolik');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const res = await verifyUserbotPassword(verifyPhone, verifyPassword);
      if (res.success && res.is_authorized) {
        setVerifyPhone(null);
        setVerifyStep(null);
        setVerifyPassword('');
        loadData();
      } else {
        setVerifyError(res.message || 'Parol noto\'g\'ri');
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || err.message || 'Xatolik');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRemove = async (phone) => {
    if (!window.confirm(`${phone} userbotni o'chirmoqchimisiz?`)) return;

    try {
      const res = await removeUserbot(phone);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'O\'chirishda xatolik');
    }
  };

  if (loading) return <div className="container"><div className="loading">Yuklanmoqda...</div></div>;

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="error-message">Bu sahifa faqat adminlar uchun</div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const colors = {
      active: { bg: '#d4edda', color: '#155724' },
      banned: { bg: '#f8d7da', color: '#721c24' },
      error: { bg: '#f8d7da', color: '#721c24' },
      unauthorized: { bg: '#fff3cd', color: '#856404' },
      disconnected: { bg: '#e2e3e5', color: '#383d41' }
    };
    const c = colors[status] || colors.disconnected;
    return (
      <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '12px',
        fontWeight: '600', backgroundColor: c.bg, color: c.color
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="container">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '10px'
      }}>
        <h1 className="page-title" style={{ margin: 0 }}>Userbotlar boshqaruvi</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleCheckStatus} disabled={checkingStatus}>
            {checkingStatus ? 'Tekshirilmoqda...' : 'Statusni tekshirish'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            + Yangi userbot
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Verification modal */}
      {verifyPhone && verifyStep && (
        <div style={{
          padding: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba',
          borderRadius: '8px', marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px' }}>
            {verifyStep === 'code' ? `${verifyPhone} uchun kod kiriting` : `${verifyPhone} uchun 2FA parol`}
          </h3>
          <form onSubmit={verifyStep === 'code' ? handleVerifyCode : handleVerifyPassword}>
            <input
              type="text"
              className="form-input"
              value={verifyStep === 'code' ? verifyCode : verifyPassword}
              onChange={(e) => verifyStep === 'code' ? setVerifyCode(e.target.value) : setVerifyPassword(e.target.value)}
              placeholder={verifyStep === 'code' ? 'Telegram kod' : '2FA parol'}
              style={{ marginBottom: '10px' }}
            />
            {verifyError && (
              <div style={{ color: '#dc3545', fontSize: '14px', marginBottom: '10px' }}>{verifyError}</div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={verifyLoading}>
                {verifyLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => {
                setVerifyPhone(null); setVerifyStep(null);
                setVerifyCode(''); setVerifyPassword('');
              }}>
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add userbot form */}
      {showAddForm && (
        <div style={{
          padding: '20px', backgroundColor: '#e8f4fd', border: '1px solid #b8daff',
          borderRadius: '8px', marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px' }}>Yangi userbot qo'shish</h3>
          <form onSubmit={handleAddUserbot}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <input type="text" className="form-input" value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)} placeholder="Telefon raqam (+998...)"
                style={{ flex: '1', minWidth: '150px' }}
              />
              <input type="number" className="form-input" value={addApiId}
                onChange={(e) => setAddApiId(e.target.value)} placeholder="API ID"
                style={{ flex: '1', minWidth: '100px' }}
              />
              <input type="text" className="form-input" value={addApiHash}
                onChange={(e) => setAddApiHash(e.target.value)} placeholder="API Hash"
                style={{ flex: '2', minWidth: '200px' }}
              />
            </div>
            {addError && (
              <div style={{ color: '#dc3545', fontSize: '14px', marginBottom: '10px' }}>{addError}</div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={addLoading}>
                {addLoading ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Userbots list */}
      {userbots.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <h3 style={{ color: '#666' }}>Hozircha userbotlar yo'q</h3>
          <p style={{ color: '#999' }}>Yangi userbot qo'shing</p>
        </div>
      ) : (
        <div className="grid">
          {userbots.map(ub => (
            <div key={ub.phone} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>{ub.phone}</h3>
                {getStatusBadge(ub.status)}
              </div>

              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                <p style={{ margin: '4px 0' }}>
                  Avtorizatsiya: {ub.is_authorized ? 'Ha' : 'Yo\'q'}
                </p>
                <p style={{ margin: '4px 0' }}>
                  Guruhlar soni: {ub.total_groups || 0}
                </p>
                {ub.last_checked && (
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#999' }}>
                    Oxirgi tekshiruv: {ub.last_checked}
                  </p>
                )}
                {ub.error_message && (
                  <p style={{ margin: '8px 0', color: '#dc3545', fontSize: '13px' }}>
                    Xato: {ub.error_message}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '12px' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRemove(ub.phone)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                >
                  O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
