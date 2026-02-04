import { useState, useEffect, useRef } from 'react';
import {
  listUserbots,
  checkUserbotStatus,
  addUserbot,
  verifyUserbotCode,
  verifyUserbotPassword,
  removeUserbot,
  getUserMe,
  getGroupMonitoringStats,
  getUserbotHealth,
} from '../services/api';

// ============================================
// ADMIN PAGE STATES
// ============================================
const VIEWS = {
  USERBOTS: 'userbots',
  ADD_FORM: 'add_form',
  VERIFY_CODE: 'verify_code',
  VERIFY_PASSWORD: 'verify_password',
  MONITORING: 'monitoring',
};

export default function UserbotManagementPage() {
  // Core state
  const [view, setView] = useState(VIEWS.USERBOTS);
  const [userbots, setUserbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add userbot form
  const [addPhone, setAddPhone] = useState('');
  const [addApiId, setAddApiId] = useState('');
  const [addApiHash, setAddApiHash] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Verification
  const [verifyPhone, setVerifyPhone] = useState(null);
  const [verifyCodeVal, setVerifyCodeVal] = useState('');
  const [verifyPasswordVal, setVerifyPasswordVal] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Status check
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Monitoring stats
  const [monitoringStats, setMonitoringStats] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const monitoringPollRef = useRef(null);

  // Auto-clear messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Initial load
  useEffect(() => {
    loadData();
    return () => {
      if (monitoringPollRef.current) clearInterval(monitoringPollRef.current);
    };
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================
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

  const loadMonitoringStats = async () => {
    setMonitoringLoading(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        getGroupMonitoringStats(),
        getUserbotHealth(),
      ]);
      setMonitoringStats(statsRes);
      setHealthData(healthRes);
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || 'Monitoring yuklanmadi'
      );
    } finally {
      setMonitoringLoading(false);
    }
  };

  // ============================================
  // ACTION HANDLERS
  // ============================================
  const handleCheckStatus = async () => {
    if (userbots.length === 0) return;
    setCheckingStatus(true);
    try {
      const phones = userbots.map((u) => u.phone);
      const res = await checkUserbotStatus(phones);
      if (res.success && res.statuses) {
        setUserbots((prev) =>
          prev.map((ub) => {
            const fresh = res.statuses.find((s) => s.phone === ub.phone);
            return fresh ? { ...ub, ...fresh } : ub;
          })
        );
        setSuccessMsg('Statuslar yangilandi');
      }
    } catch (err) {
      setError('Status tekshirishda xatolik');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleAddUserbot = async (e) => {
    e.preventDefault();
    if (!addPhone || !addApiId || !addApiHash) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    setAddLoading(true);
    setError(null);
    try {
      const res = await addUserbot(addPhone, parseInt(addApiId), addApiHash);
      if (res.success && res.requires_code) {
        setVerifyPhone(addPhone);
        setView(VIEWS.VERIFY_CODE);
        setAddPhone('');
        setAddApiId('');
        setAddApiHash('');
      } else if (res.success) {
        setSuccessMsg("Userbot muvaffaqiyatli qo'shildi");
        setView(VIEWS.USERBOTS);
        setAddPhone('');
        setAddApiId('');
        setAddApiHash('');
        loadData();
      } else {
        setError(res.message || 'Xatolik');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Xatolik'
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError(null);
    try {
      const res = await verifyUserbotCode(verifyPhone, verifyCodeVal);
      if (res.success && res.is_authorized) {
        setSuccessMsg('Userbot muvaffaqiyatli autorizatsiya qilindi!');
        resetVerification();
        loadData();
      } else if (res.requires_password) {
        setView(VIEWS.VERIFY_PASSWORD);
        setVerifyCodeVal('');
      } else {
        setError(res.message || "Kod noto'g'ri");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Xatolik'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError(null);
    try {
      const res = await verifyUserbotPassword(verifyPhone, verifyPasswordVal);
      if (res.success && res.is_authorized) {
        setSuccessMsg('Userbot muvaffaqiyatli autorizatsiya qilindi!');
        resetVerification();
        loadData();
      } else {
        setError(res.message || "Parol noto'g'ri");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Xatolik'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRemove = async (phone) => {
    if (!window.confirm(`${phone} userbotni o'chirmoqchimisiz?`)) return;
    try {
      const res = await removeUserbot(phone);
      if (res.success) {
        setSuccessMsg(`${phone} o'chirildi`);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "O'chirishda xatolik");
    }
  };

  const resetVerification = () => {
    setVerifyPhone(null);
    setVerifyCodeVal('');
    setVerifyPasswordVal('');
    setView(VIEWS.USERBOTS);
  };

  const handleOpenMonitoring = () => {
    setView(VIEWS.MONITORING);
    loadMonitoringStats();
    monitoringPollRef.current = setInterval(loadMonitoringStats, 10000);
  };

  const handleCloseMonitoring = () => {
    setView(VIEWS.USERBOTS);
    if (monitoringPollRef.current) {
      clearInterval(monitoringPollRef.current);
      monitoringPollRef.current = null;
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  if (loading) {
    return (
      <div className="container">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="error-message">Bu sahifa faqat adminlar uchun</div>
      </div>
    );
  }

  const getStatusBadge = (st) => {
    const config = {
      active: { bg: '#d4edda', color: '#155724', label: 'Aktiv' },
      banned: { bg: '#f8d7da', color: '#721c24', label: 'Bloklangan' },
      error: { bg: '#f8d7da', color: '#721c24', label: 'Xato' },
      unauthorized: { bg: '#fff3cd', color: '#856404', label: 'Avtorizatsiya kerak' },
      disconnected: { bg: '#e2e3e5', color: '#383d41', label: 'Uzilgan' },
    };
    const c = config[st] || config.disconnected;
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: '600',
          backgroundColor: c.bg,
          color: c.color,
        }}
      >
        {c.label}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isUserbotView =
    view === VIEWS.USERBOTS || view === VIEWS.ADD_FORM;

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="container">
      {/* Toast messages */}
      {successMsg && (
        <div style={toastSuccessStyle}>{successMsg}</div>
      )}
      {error && (
        <div style={toastErrorStyle}>{error}</div>
      )}

      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Userbotlar boshqaruvi
        </h1>
      </div>

      {/* TAB BUTTONS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => {
            handleCloseMonitoring();
            setView(VIEWS.USERBOTS);
          }}
          style={{
            ...tabBtnStyle,
            ...(isUserbotView ? tabBtnActiveStyle : {}),
          }}
        >
          Userbotlar ({userbots.length})
        </button>

        <button
          onClick={handleOpenMonitoring}
          style={{
            ...tabBtnStyle,
            ...(view === VIEWS.MONITORING ? tabBtnActiveStyle : {}),
          }}
        >
          Guruh monitoring
        </button>

        {/* Action buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {view === VIEWS.USERBOTS && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCheckStatus}
                disabled={checkingStatus || userbots.length === 0}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {checkingStatus ? '...' : 'Status tekshirish'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setView(VIEWS.ADD_FORM)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                + Yangi userbot
              </button>
            </>
          )}
          {view === VIEWS.MONITORING && (
            <button
              className="btn btn-secondary"
              onClick={loadMonitoringStats}
              disabled={monitoringLoading}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {monitoringLoading ? '...' : 'Yangilash'}
            </button>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* VIEW: ADD USERBOT FORM */}
      {/* ============================================ */}
      {view === VIEWS.ADD_FORM && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3
            style={{
              margin: '0 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Yangi userbot qo&apos;shish
          </h3>
          <form onSubmit={handleAddUserbot}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label htmlFor="add-phone" style={labelStyle}>Telefon raqam</label>
                <input
                  id="add-phone"
                  type="text"
                  className="form-input"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="+998901234567"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="add-api-id" style={labelStyle}>API ID</label>
                  <input
                    id="add-api-id"
                    type="number"
                    className="form-input"
                    value={addApiId}
                    onChange={(e) => setAddApiId(e.target.value)}
                    placeholder="my.telegram.org dan"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label htmlFor="add-api-hash" style={labelStyle}>API Hash</label>
                  <input
                    id="add-api-hash"
                    type="text"
                    className="form-input"
                    value={addApiHash}
                    onChange={(e) => setAddApiHash(e.target.value)}
                    placeholder="my.telegram.org dan"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setView(VIEWS.USERBOTS);
                  setAddPhone('');
                  setAddApiId('');
                  setAddApiHash('');
                }}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addLoading}
                style={{ flex: 1 }}
              >
                {addLoading ? 'Yuborilmoqda...' : "Qo'shish"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: VERIFY CODE */}
      {/* ============================================ */}
      {view === VIEWS.VERIFY_CODE && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            borderLeft: '4px solid #ffc107',
          }}
        >
          <h3 style={{ margin: '0 0 4px' }}>Telegram kodni kiriting</h3>
          <p
            style={{
              margin: '0 0 16px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            {verifyPhone} raqamiga yuborilgan kodni kiriting
          </p>
          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              className="form-input"
              value={verifyCodeVal}
              onChange={(e) => setVerifyCodeVal(e.target.value)}
              placeholder="12345"
              maxLength={6}
              style={{
                ...inputStyle,
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
              }}
            />
            <div
              style={{ display: 'flex', gap: '10px', marginTop: '16px' }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetVerification}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={verifyLoading || verifyCodeVal.length < 5}
                style={{ flex: 1 }}
              >
                {verifyLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: VERIFY PASSWORD (2FA) */}
      {/* ============================================ */}
      {view === VIEWS.VERIFY_PASSWORD && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            borderLeft: '4px solid #dc3545',
          }}
        >
          <h3 style={{ margin: '0 0 4px' }}>2FA Parol</h3>
          <p
            style={{
              margin: '0 0 16px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            {verifyPhone} uchun ikki bosqichli parolni kiriting
          </p>
          <form onSubmit={handleVerifyPassword}>
            <input
              type="password"
              className="form-input"
              value={verifyPasswordVal}
              onChange={(e) => setVerifyPasswordVal(e.target.value)}
              placeholder="2FA parol"
              style={inputStyle}
            />
            <div
              style={{ display: 'flex', gap: '10px', marginTop: '16px' }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetVerification}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={verifyLoading || !verifyPasswordVal}
                style={{ flex: 1 }}
              >
                {verifyLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: USERBOTS LIST */}
      {/* ============================================ */}
      {isUserbotView && (
        <>
          {userbots.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: 'center', padding: '50px 20px' }}
            >
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>
                🤖
              </div>
              <h3 style={{ color: '#555', marginBottom: '8px' }}>
                Hozircha userbotlar yo&apos;q
              </h3>
              <p style={{ color: '#999', marginBottom: '24px' }}>
                Yangi userbot qo&apos;shib, guruhlarni kuzatishni boshlang
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setView(VIEWS.ADD_FORM)}
              >
                + Birinchi userbotni qo&apos;shish
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {userbots.map((ub) => (
                <div
                  key={ub.phone}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {/* Left side - info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{ fontSize: '16px', fontWeight: '700' }}
                      >
                        {ub.phone}
                      </span>
                      {getStatusBadge(ub.status)}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '13px',
                        color: '#777',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>Guruhlar: {ub.total_groups || 0}</span>
                      {ub.last_checked && (
                        <span>
                          Tekshirildi: {formatDate(ub.last_checked)}
                        </span>
                      )}
                      {ub.last_message_sent && (
                        <span>
                          Oxirgi xabar:{' '}
                          {formatDate(ub.last_message_sent)}
                        </span>
                      )}
                    </div>

                    {ub.error_message && (
                      <div
                        style={{
                          marginTop: '6px',
                          color: '#dc3545',
                          fontSize: '12px',
                        }}
                      >
                        Xato: {ub.error_message}
                      </div>
                    )}
                  </div>

                  {/* Right side - actions */}
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemove(ub.phone)}
                    style={{
                      padding: '6px 16px',
                      fontSize: '13px',
                    }}
                  >
                    O&apos;chirish
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* VIEW: MONITORING STATS */}
      {/* ============================================ */}
      {view === VIEWS.MONITORING && (
        <div>
          {monitoringLoading && !monitoringStats ? (
            <div className="loading" style={{ padding: '40px' }}>
              Monitoring yuklanmoqda...
            </div>
          ) : monitoringStats ? (
            <>
              {/* Service Health Card */}
              {healthData && (
                <div
                  className="card"
                  style={{
                    marginBottom: '16px',
                    borderLeft: `4px solid ${healthData.status === 'healthy' ? '#28a745' : '#dc3545'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '16px' }}>
                      Userbot Service
                    </h3>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor:
                          healthData.status === 'healthy'
                            ? '#d4edda'
                            : '#f8d7da',
                        color:
                          healthData.status === 'healthy'
                            ? '#155724'
                            : '#721c24',
                      }}
                    >
                      {healthData.status === 'healthy'
                        ? 'Ishlayapti'
                        : 'Muammo'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      flexWrap: 'wrap',
                      fontSize: '14px',
                    }}
                  >
                    <StatItem
                      label="Aktiv clientlar"
                      value={healthData.active_clients || 0}
                    />
                    <StatItem
                      label="Kutilayotgan"
                      value={healthData.pending_clients || 0}
                    />
                    {healthData.group_monitoring && (
                      <>
                        <StatItem
                          label="Aktiv listenerlar"
                          value={
                            healthData.group_monitoring
                              .active_listeners || 0
                          }
                        />
                        <StatItem
                          label="Processor"
                          value={
                            healthData.group_monitoring
                              .is_processor_running
                              ? 'Ishlayapti'
                              : "To'xtagan"
                          }
                          valueColor={
                            healthData.group_monitoring
                              .is_processor_running
                              ? '#28a745'
                              : '#dc3545'
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Processing Stats Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <StatCard
                  title="Jami o'qilgan"
                  value={monitoringStats.total_processed || 0}
                  icon="📨"
                  color="#007bff"
                />
                <StatCard
                  title="Bazaga qo'shilgan"
                  value={monitoringStats.total_inserted || 0}
                  icon="✅"
                  color="#28a745"
                />
                <StatCard
                  title="Dublikatlar"
                  value={monitoringStats.total_duplicates || 0}
                  icon="🔁"
                  color="#ffc107"
                />
                <StatCard
                  title="Parse xatolik"
                  value={monitoringStats.total_parse_errors || 0}
                  icon="❌"
                  color="#dc3545"
                />
              </div>

              {/* File Status Card */}
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
                  Fayl holati (group_orders.jsonl)
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '14px',
                  }}
                >
                  <StatItem
                    label="Fayl mavjud"
                    value={monitoringStats.file_exists ? 'Ha' : "Yo'q"}
                    valueColor={
                      monitoringStats.file_exists ? '#28a745' : '#999'
                    }
                  />
                  <StatItem
                    label="Fayl hajmi"
                    value={formatFileSize(
                      monitoringStats.file_size_bytes || 0
                    )}
                  />
                  <StatItem label="Hajm limiti" value="10 MB" />
                  {monitoringStats.file_exists && (
                    <StatItem
                      label="Foiz to'lgan"
                      value={`${(
                        (monitoringStats.file_size_bytes /
                          (10 * 1024 * 1024)) *
                        100
                      ).toFixed(1)}%`}
                      valueColor={
                        monitoringStats.file_size_bytes >
                        8 * 1024 * 1024
                          ? '#dc3545'
                          : monitoringStats.file_size_bytes >
                              5 * 1024 * 1024
                            ? '#ffc107'
                            : '#28a745'
                      }
                    />
                  )}
                </div>

                {/* File size progress bar */}
                {monitoringStats.file_exists && (
                  <div
                    style={{
                      marginTop: '12px',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '4px',
                        width: `${Math.min(
                          (monitoringStats.file_size_bytes /
                            (10 * 1024 * 1024)) *
                            100,
                          100
                        )}%`,
                        backgroundColor:
                          monitoringStats.file_size_bytes >
                          8 * 1024 * 1024
                            ? '#dc3545'
                            : monitoringStats.file_size_bytes >
                                5 * 1024 * 1024
                              ? '#ffc107'
                              : '#28a745',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Processor Details */}
              <div className="card">
                <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
                  Processor holati
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '14px',
                  }}
                >
                  <StatItem
                    label="Holati"
                    value={
                      monitoringStats.is_running
                        ? 'Ishlayapti'
                        : "To'xtagan"
                    }
                    valueColor={
                      monitoringStats.is_running ? '#28a745' : '#dc3545'
                    }
                  />
                  <StatItem
                    label="Aktiv listenerlar"
                    value={monitoringStats.active_listeners || 0}
                  />
                  <StatItem
                    label="Oxirgi qayta ishlash"
                    value={
                      monitoringStats.last_processed_at
                        ? formatDate(monitoringStats.last_processed_at)
                        : '-'
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              className="card"
              style={{ textAlign: 'center', padding: '40px' }}
            >
              <p style={{ color: '#666' }}>
                Monitoring ma&apos;lumotlari yuklanmadi
              </p>
              <button
                className="btn btn-primary"
                onClick={loadMonitoringStats}
                style={{ marginTop: '12px' }}
              >
                Qayta yuklash
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({ title, value, icon, color }) {
  return (
    <div
      className="card"
      style={{
        padding: '16px',
        textAlign: 'center',
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
        {title}
      </div>
    </div>
  );
}

function StatItem({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontWeight: '600', color: valueColor || '#333' }}>
        {value}
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const tabBtnStyle = {
  padding: '8px 16px',
  borderRadius: '20px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  color: '#555',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const tabBtnActiveStyle = {
  backgroundColor: '#007bff',
  color: '#fff',
  borderColor: '#007bff',
};

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  fontWeight: '600',
  fontSize: '13px',
  color: '#444',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
};

const toastSuccessStyle = {
  position: 'fixed',
  top: '80px',
  right: '20px',
  padding: '12px 20px',
  backgroundColor: '#d4edda',
  color: '#155724',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 9999,
  fontSize: '14px',
  fontWeight: '500',
};

const toastErrorStyle = {
  position: 'fixed',
  top: '80px',
  right: '20px',
  padding: '12px 20px',
  backgroundColor: '#f8d7da',
  color: '#721c24',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 9999,
  fontSize: '14px',
  fontWeight: '500',
  maxWidth: '350px',
};
