/**
 * Mobile Order Detail Page
 * Full order info with status-based actions
 * Includes broadcast and phone functionality
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyOrder, deleteOrder, getUserMe, broadcastMessage as sendBroadcast, getBroadcastStatus } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatTime';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';

const STATUS_CONFIG = {
  created: { badge: 'm-badge-new', label: 'YANGI' },
  searching: { badge: 'm-badge-searching', label: 'QIDIRILMOQDA' },
  appointed: { badge: 'm-badge-appointed', label: 'BIRIKTIRILDI' },
  completed: { badge: 'm-badge-completed', label: 'YAKUNLANDI' },
  cancelled: { badge: 'm-badge-cancelled', label: 'BEKOR QILINDI' },
};

export default function MobileOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useMobileAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [error, setError] = useState('');

  // User and permission state
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [permissions, setPermissions] = useState(null);

  // Phone sheet
  const [phoneSheet, setPhoneSheet] = useState({ open: false, phone: '' });

  // Broadcast state
  const [broadcastSheet, setBroadcastSheet] = useState(false);
  const [broadcastMessage, setBroadcastMessageText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastId, setBroadcastId] = useState(null);
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const [broadcastError, setBroadcastError] = useState('');

  // Load user data
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
        setPermissions(response.result.permissions || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await getMyOrder(id);
      if (response.code === 200) {
        setOrder(response.result);
      } else {
        setError('Buyurtma topilmadi');
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const response = await deleteOrder(id);
      if (response.code === 200) {
        navigate('/mobile/orders', { replace: true });
      } else {
        setError('O\'chirishda xatolik');
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setDeleteLoading(false);
      setDeleteSheet(false);
    }
  };

  const handleFindTransport = () => {
    // MUST match Desktop MyOrdersPage.jsx handleFindTransport EXACTLY
    if (!permissions?.offerToDriver) {
      // Permission check - matches Desktop
      return;
    }

    // Build filters from order - matches Desktop
    const filters = {
      fromCountry: order.fromLocation?.countryId,
      fromRegion: order.fromLocation?.regionId,
      fromCity: order.fromLocation?.cityId,
      vehicleType: order.vehicleType,
    };

    navigate('/mobile/transports', {
      state: {
        orderId: order.id || order._id,
        fromOrder: true,
        orderInfo: {
          cargoName: order.cargoName || order.cargo_name,
          fromCity: order.fromCity,
          toCity: order.toCity,
          weightKg: order.weightKg || order.weight,
          vehicleType: order.vehicleType,
          priceUzs: order.priceUzs,
        },
        filters: filters,
      },
    });
  };

  const handleCallDriver = () => {
    if (order?.driverPhone) {
      window.location.href = `tel:${order.driverPhone}`;
    }
  };

  const handleShowPhone = () => {
    const phone = order?.additionalPhone || order?.phone;
    if (phone) {
      setPhoneSheet({ open: true, phone });
    }
  };

  const handleCallPhone = () => {
    if (phoneSheet.phone) {
      window.location.href = `tel:${phoneSheet.phone}`;
    }
  };

  const handleCopyPhone = () => {
    if (phoneSheet.phone) {
      navigator.clipboard.writeText(phoneSheet.phone);
    }
  };

  // Build broadcast message from order
  const buildOrderMessage = (o) => {
    let msg = '';
    if (o.cargoName || o.cargo_name) msg += `${o.cargoName || o.cargo_name}\n`;
    if (o.fromCity || o.fromRegion) msg += `Qayerdan: ${o.fromCity || o.fromRegion}\n`;
    if (o.toCity || o.toRegion) msg += `Qayerga: ${o.toCity || o.toRegion}\n`;
    if (o.weight || o.weightKg) msg += `Og'irligi: ${o.weight || o.weightKg} t\n`;
    if (o.vehicleType) msg += `Transport: ${o.vehicleType}\n`;
    if (o.priceUzs && o.priceUzs > 0) msg += `Narxi: ${o.priceUzs.toLocaleString('uz-UZ')} so'm\n`;
    if (o.description && o.description !== 'null' && o.description.trim()) {
      msg += `\n${o.description}\n`;
    }
    if (o.additionalPhone) msg += `\nTel: ${o.additionalPhone}`;
    return msg.trim();
  };

  const handleOpenBroadcast = () => {
    if (order) {
      setBroadcastMessageText(buildOrderMessage(order));
      setBroadcastId(null);
      setBroadcastStatus(null);
      setBroadcastError('');
    }
    setBroadcastSheet(true);
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setBroadcastError('Xabar matni bo\'sh bo\'lishi mumkin emas');
      return;
    }

    try {
      setBroadcasting(true);
      setBroadcastError('');

      const response = await sendBroadcast(broadcastMessage.trim());

      if (response.success) {
        setBroadcastId(response.broadcast_id);
        setBroadcastStatus({
          status: 'in_progress',
          total_userbots: response.total_userbots,
          total_groups: response.total_groups || 0,
          groups_sent: 0,
          groups_failed: 0,
        });
        // Start polling
        pollBroadcastStatus(response.broadcast_id);
      } else {
        setBroadcastError(response.message || 'Tarqatishda xatolik');
        setBroadcasting(false);
      }
    } catch (error) {
      setBroadcastError('Xatolik yuz berdi');
      setBroadcasting(false);
    }
  };

  const pollBroadcastStatus = async (id) => {
    const poll = setInterval(async () => {
      try {
        const res = await getBroadcastStatus(id);
        setBroadcastStatus(res);
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(poll);
          setBroadcasting(false);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 3000);
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return '';
    return Number(price).toLocaleString('uz-UZ').replace(/,/g, ' ') + ' so\'m';
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.created;
  };

  if (loading) {
    return (
      <>
        <TopBar title="Buyurtma" showBack />
        <MobileLoading fullScreen />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <TopBar title="Buyurtma" showBack />
        <main className="m-content m-content-padded">
          <div className="m-empty">
            <div className="m-empty-icon">❌</div>
            <h3 className="m-empty-title">{error || 'Buyurtma topilmadi'}</h3>
            <button className="m-btn m-btn-primary" onClick={() => navigate('/mobile/orders')}>
              Orqaga
            </button>
          </div>
        </main>
      </>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const isActive = ['created', 'searching'].includes(order.status);
  const isAppointed = order.status === 'appointed';

  return (
    <>
      <TopBar title="Buyurtma" showBack />

      <main className="m-content m-content-padded" style={{ paddingBottom: isActive || isAppointed ? 100 : 24 }}>
        {/* Status badge and title */}
        <div className="m-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span className={`m-badge ${statusConfig.badge}`}>{statusConfig.label}</span>
          </div>
          <h1 className="m-detail-title">
            {order.cargoName || order.cargo_name || 'Yuk'}
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {order.weight && (
              <span style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
                ⚖️ {order.weight} tonna
              </span>
            )}
            {order.vehicleType && (
              <span style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
                🚚 {order.vehicleType}
              </span>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="m-detail-section">
          <h2 className="m-detail-section-title">📍 Marshrut</h2>
          <div className="m-route">
            <div className="m-route-point">
              <div className="m-route-dot" style={{ background: 'var(--m-success)' }} />
              <span className="m-route-text">
                {order.fromCity || order.fromRegion || 'Noma\'lum'}
              </span>
            </div>
            <div className="m-route-line" />
            <div className="m-route-point">
              <div className="m-route-dot" style={{ background: 'var(--m-danger)' }} />
              <span className="m-route-text">
                {order.toCity || order.toRegion || 'Noma\'lum'}
              </span>
            </div>
          </div>
        </div>

        {/* Price */}
        {order.priceUzs && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">💰 Narx</h2>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--m-success)' }}>
              {formatPrice(order.priceUzs)}
            </div>
          </div>
        )}

        {/* Driver info (if appointed) */}
        {isAppointed && order.driverPhone && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">👤 Haydovchi</h2>
            <div className="m-inline-edit" onClick={handleCallDriver}>
              <div className="m-inline-edit-content">
                <div className="m-inline-edit-label">Telefon</div>
                <div className="m-inline-edit-value">{order.driverPhone}</div>
              </div>
              <span className="m-inline-edit-icon">📞</span>
            </div>
          </div>
        )}

        {/* Description */}
        {order.description && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">📝 Izoh</h2>
            <p style={{ fontSize: 16, color: 'var(--m-text)', margin: 0 }}>
              {order.description}
            </p>
          </div>
        )}

        {/* Time */}
        <div className="m-detail-section">
          <div style={{ fontSize: 14, color: 'var(--m-text-muted)' }}>
            📅 {formatTimeAgo(order.createdAt || order.created_at)} yaratilgan
          </div>
        </div>
      </main>

      {/* Action bar for active orders */}
      {isActive && (
        <div className="m-action-bar" style={{ flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button className="m-btn m-btn-danger" onClick={() => setDeleteSheet(true)}>
              🗑️
            </button>
            {(order?.additionalPhone || order?.phone) && (
              <button className="m-btn m-btn-secondary" onClick={handleShowPhone}>
                📞
              </button>
            )}
            <button className="m-btn m-btn-primary m-btn-lg" onClick={handleFindTransport} style={{ flex: 1 }}>
              🔍 Transport topish
            </button>
          </div>
          {isInternalDispatcher && (
            <button
              className="m-btn m-btn-lg"
              onClick={handleOpenBroadcast}
              style={{ width: '100%', background: '#6f42c1', color: 'white' }}
            >
              📡 Guruhlarga tarqatish
            </button>
          )}
        </div>
      )}

      {/* Action bar for appointed */}
      {isAppointed && (
        <div className="m-action-bar">
          <button className="m-btn m-btn-success m-btn-lg" onClick={handleCallDriver} style={{ flex: 1 }}>
            📞 Haydovchiga qo'ng'iroq
          </button>
        </div>
      )}

      {/* Delete confirmation sheet */}
      <BottomSheet
        isOpen={deleteSheet}
        onClose={() => setDeleteSheet(false)}
        title="Buyurtmani o'chirish"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
          <p style={{ fontSize: 16, color: 'var(--m-text)', marginBottom: 24 }}>
            Buyurtmani o'chirishni xohlaysizmi?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="m-btn m-btn-secondary m-btn-lg"
              style={{ flex: 1 }}
              onClick={() => setDeleteSheet(false)}
            >
              Bekor qilish
            </button>
            <button
              className="m-btn m-btn-danger m-btn-lg"
              style={{ flex: 1 }}
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'O\'chirilmoqda...' : 'O\'chirish'}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Phone bottom sheet */}
      <BottomSheet
        isOpen={phoneSheet.open}
        onClose={() => setPhoneSheet({ open: false, phone: '' })}
        title="📞 Telefon raqami"
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--m-text)' }}>
            {phoneSheet.phone}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="m-btn m-btn-secondary m-btn-lg" onClick={handleCopyPhone} style={{ flex: 1 }}>
              📋 Nusxalash
            </button>
            <button className="m-btn m-btn-success m-btn-lg" onClick={handleCallPhone} style={{ flex: 1 }}>
              📞 Qo'ng'iroq
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Broadcast bottom sheet */}
      <BottomSheet
        isOpen={broadcastSheet}
        onClose={() => {
          if (!broadcasting) {
            setBroadcastSheet(false);
            setBroadcastError('');
          }
        }}
        title="📡 Guruhlarga tarqatish"
        height="full"
        footer={
          !broadcastId && (
            <button
              className="m-btn m-btn-lg m-btn-full"
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastMessage.trim()}
              style={{ background: '#6f42c1', color: 'white' }}
            >
              {broadcasting ? 'Yuborilmoqda...' : 'Tarqatish'}
            </button>
          )
        }
      >
        <div style={{ padding: '8px 0' }}>
          {/* Message editor (before broadcast) */}
          {!broadcastId && (
            <>
              <div className="m-form-group">
                <label className="m-form-label">Xabar matni</label>
                <textarea
                  className="m-form-textarea"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessageText(e.target.value)}
                  rows={10}
                  maxLength={4096}
                  style={{ fontFamily: 'inherit' }}
                />
                <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--m-text-muted)', marginTop: 4 }}>
                  {broadcastMessage.length}/4096
                </div>
              </div>

              {broadcastError && (
                <div style={{ padding: 12, background: '#f8d7da', borderRadius: 8, color: '#721c24', marginBottom: 16 }}>
                  {broadcastError}
                </div>
              )}
            </>
          )}

          {/* Broadcast status */}
          {broadcastId && broadcastStatus && (
            <div>
              <div style={{
                padding: 16, borderRadius: 8, marginBottom: 16,
                background: broadcastStatus.status === 'completed' ? '#d4edda' :
                            broadcastStatus.status === 'failed' ? '#f8d7da' : '#fff3cd',
                color: broadcastStatus.status === 'completed' ? '#155724' :
                       broadcastStatus.status === 'failed' ? '#721c24' : '#856404'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
                  {broadcastStatus.status === 'in_progress' && '⏳ Tarqatilmoqda...'}
                  {broadcastStatus.status === 'completed' && '✓ Tarqatish yakunlandi!'}
                  {broadcastStatus.status === 'failed' && '✗ Tarqatishda xatolik!'}
                </div>
                <div style={{ fontSize: 14 }}>
                  <p style={{ margin: '4px 0' }}>
                    Jami guruhlar: {broadcastStatus.total_groups || 0}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    Yuborildi: {broadcastStatus.groups_sent || 0} / {broadcastStatus.total_groups || 0}
                  </p>
                  {(broadcastStatus.groups_failed || 0) > 0 && (
                    <p style={{ margin: '4px 0', color: '#dc3545' }}>
                      Xatolik: {broadcastStatus.groups_failed} guruh
                    </p>
                  )}
                </div>

                {broadcastStatus.status === 'in_progress' && (
                  <div style={{
                    marginTop: 12, height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: 3
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: '#6f42c1',
                      width: broadcastStatus.total_groups > 0
                        ? `${(((broadcastStatus.groups_sent || 0) + (broadcastStatus.groups_failed || 0)) / broadcastStatus.total_groups) * 100}%`
                        : '0%',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                )}
              </div>

              <button
                className="m-btn m-btn-primary m-btn-full m-btn-lg"
                onClick={() => {
                  setBroadcastSheet(false);
                  setBroadcastId(null);
                  setBroadcastStatus(null);
                }}
                disabled={broadcastStatus.status === 'in_progress'}
              >
                {broadcastStatus.status === 'in_progress' ? 'Kutilmoqda...' : 'Yopish'}
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
