/**
 * Mobile My Orders Page
 * MUST match Desktop MyOrdersPage.jsx functionality:
 * - Delete order
 * - Find transport (Mashina topish)
 * - Broadcast to groups (Guruhlarga tarqatish)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyOrders,
  deleteOrder,
  getUserMe,
  broadcastMessage as sendBroadcast,
  getBroadcastStatus,
  getCargoOwnerNeedProfile,
  updateCargoOwnerNeedProfile,
} from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import { formatTimeAgo } from '../../utils/formatTime';
import { getOrderStatusText, getOrderStatusClass, hasAppointedDriver } from '../../utils/orderStatus';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading, { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import { buildCompactOrderMessage, formatOrderPrice } from '../../utils/orderText';
import CargoOwnerNeedProfileCard, { buildCargoOwnerNeedTransportState } from '../../components/CargoOwnerNeedProfileCard';

export default function MobileMyOrders() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [permissions, setPermissions] = useState(null);

  // Delete state
  const [deleteSheet, setDeleteSheet] = useState({ open: false, order: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Broadcast state
  const [broadcastSheet, setBroadcastSheet] = useState({ open: false, order: null });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastId, setBroadcastId] = useState(null);
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const [broadcastError, setBroadcastError] = useState('');
  const [needProfile, setNeedProfile] = useState(null);
  const [needSheetOpen, setNeedSheetOpen] = useState(false);
  const [savingNeedProfile, setSavingNeedProfile] = useState(false);

  // Load user data - matches Desktop
  useEffect(() => {
    loadUserData();
    loadNeedProfile();
  }, []);

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

  const loadNeedProfile = async () => {
    try {
      const response = await getCargoOwnerNeedProfile();
      if (response.code === 200) setNeedProfile(response.result);
    } catch (err) {
      console.error('Failed to load need profile:', err);
    }
  };

  const handleSaveNeedProfile = async (payload) => {
    try {
      setSavingNeedProfile(true);
      const response = await updateCargoOwnerNeedProfile(payload);
      if (response.code === 200) {
        setNeedProfile(response.result);
        setNeedSheetOpen(false);
      } else {
        window.alert(response.message || 'Ehtiyoj saqlanmadi');
      }
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || 'Ehtiyoj saqlanmadi');
    } finally {
      setSavingNeedProfile(false);
    }
  };

  const handleFindTransportFromNeed = () => {
    if (!needProfile) return;
    navigate('/mobile/transports', {
      state: buildCargoOwnerNeedTransportState(needProfile, staticData, true),
    });
  };

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getMyOrders();
      if (response.code === 200) {
        setOrders(response.result || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOrderClick = (order) => {
    navigate(`/mobile/order/${order.id || order._id}`);
  };

  // Delete order - matches Desktop handleDelete
  const handleDelete = async () => {
    const order = deleteSheet.order;
    if (!order) return;

    try {
      setDeleteLoading(true);
      const response = await deleteOrder(order.id || order._id);
      if (response.code === 200) {
        setDeleteSheet({ open: false, order: null });
        loadOrders(); // Reload like Desktop
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Find transport - matches Desktop handleFindTransport EXACTLY
  const handleFindTransport = (e, order) => {
    e.stopPropagation();

    if (!permissions?.offerToDriver) {
      window.alert('Mashina topish uchun sizga ruxsat kerak. Admin bilan bog\'laning.');
      return;
    }

    // Build filters from order - matches Desktop MyOrdersPage.jsx
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
          cargoName: order.cargoName,
          fromCity: order.fromCity,
          toCity: order.toCity,
          weightKg: order.weightKg,
          vehicleType: order.vehicleType,
          priceUzs: order.priceUzs,
        },
        filters: filters,
      },
    });
  };

  // Open broadcast sheet
  const handleOpenBroadcast = (e, order) => {
    e.stopPropagation();
    setBroadcastMessage(buildOrderMessage(order));
    setBroadcastId(null);
    setBroadcastStatus(null);
    setBroadcastError('');
    setBroadcastSheet({ open: true, order });
  };

  // Build broadcast message - matches Desktop BroadcastModal
  const buildOrderMessage = (o) => {
    return buildCompactOrderMessage(o);
  };

  // Send broadcast
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

  // Format location
  const formatRoute = (order) => {
    const from = order.fromCity || order.fromRegion || 'Noma\'lum';
    const to = order.toCity || order.toRegion || 'Noma\'lum';
    return `${from} → ${to}`;
  };

  const cleanText = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    return text && text.toLowerCase() !== 'null' ? text : '';
  };

  const getOrderRows = (order) => {
    const weight = order.weightKg || order.weight;
    return [
      { label: 'Yo\'nalish', value: formatRoute(order) },
      { label: 'Yuk', value: cleanText(order.cargoName || order.cargo_name) },
      { label: 'Og\'irlik', value: weight ? `${weight} tonna` : '' },
      { label: 'Transport', value: cleanText(order.vehicleType) },
      { label: 'Narx', value: formatOrderPrice(order.priceUzs) },
      { label: 'Kontakt', value: cleanText(order.additionalPhone || order.phone) },
      { label: 'Telegram', value: cleanText(order.telegramUsername) },
      { label: 'Izoh', value: cleanText(order.description) },
      { label: 'Manba', value: cleanText(order.source) },
    ].filter((row) => row.value);
  };

  if (loading) {
    return (
      <>
        <TopBar title="Buyurtmalarim" rightIcon="+" onRightAction={() => navigate('/mobile/create-order')} />
        <main className="m-content">
          <ListSkeleton count={5} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Buyurtmalarim" rightIcon="+" onRightAction={() => navigate('/mobile/create-order')} />

      <main className="m-content">
        <div style={{ padding: '10px 12px', background: 'var(--m-card-bg)', borderBottom: '1px solid var(--m-border)' }}>
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={() => navigate('/mobile/create-order')}
            style={{ justifyContent: 'center' }}
          >
            + Yuk qo'shish
          </button>
        </div>

        <div style={{ padding: 12, background: 'var(--m-card-bg)', borderBottom: '1px solid var(--m-border)' }}>
          <div className="m-card" style={{ margin: 0, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--m-text)', marginBottom: 4 }}>
                  Yukchi ehtiyoji
                </div>
                <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', lineHeight: 1.4 }}>
                  {needProfile?.title || 'Kunlik yuk va kerakli mashina vaqtlarini sozlang'}
                </div>
                {needProfile?.requiredTimes?.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--m-text-muted)', marginTop: 6 }}>
                    {needProfile.requiredTimes.join(', ')} · {needProfile.cargoCountPerDay || 1} ta yuk/kun
                  </div>
                )}
              </div>
              <span style={{
                borderRadius: 999,
                padding: '5px 8px',
                fontSize: 11,
                fontWeight: 800,
                color: needProfile?.enabled === false ? '#64748b' : '#166534',
                background: needProfile?.enabled === false ? '#f1f5f9' : '#dcfce7',
                whiteSpace: 'nowrap',
              }}>
                {needProfile?.enabled === false ? "O'chirilgan" : 'Faol'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button className="m-btn m-btn-secondary" onClick={() => setNeedSheetOpen(true)}>
                Sozlash
              </button>
              <button className="m-btn m-btn-primary" onClick={handleFindTransportFromNeed}>
                Mashina topish
              </button>
            </div>
          </div>
        </div>

        <PullToRefresh onRefresh={() => loadOrders(true)} disabled={loading}>
          {orders.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon">📦</div>
              <h3 className="m-empty-title">Hali buyurtma yo'q</h3>
              <p className="m-empty-text">Birinchi buyurtmangizni yarating</p>
              <button
                className="m-btn m-btn-primary"
                onClick={() => navigate('/mobile/create-order')}
              >
                + Buyurtma yaratish
              </button>
            </div>
          ) : (
          <div className="m-card m-card-list">
            {orders.map((order) => {
              const isActive = !hasAppointedDriver(order.status);
              return (
                <div
                  key={order.id || order._id}
                  className="m-list-item"
                  style={{ flexDirection: 'column', alignItems: 'stretch', padding: 12 }}
                >
                  {/* Order info - clickable */}
                  <div
                    className="m-card-tap"
                    onClick={() => handleOrderClick(order)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12 }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge ${getOrderStatusClass(order.status)}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                          {getOrderStatusText(order.status)}
                        </span>
                      </div>
                      <p className="m-list-item-title" style={{ marginBottom: 4 }}>
                        {order.cargoName || 'Yuk'}
                      </p>
                      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                        {getOrderRows(order).map((row) => (
                          <div
                            key={row.label}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '82px 1fr',
                              gap: 8,
                              fontSize: 13,
                              lineHeight: 1.35,
                            }}
                          >
                            <span style={{ color: 'var(--m-text-muted)' }}>{row.label}</span>
                            <span style={{ color: 'var(--m-text)', fontWeight: 500, wordBreak: 'break-word' }}>
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Driver phone if appointed */}
                      {hasAppointedDriver(order.status) && order.driverPhone && (
                        <div style={{ marginTop: 8, padding: 8, background: '#d4edda', borderRadius: 6, fontSize: 14, color: '#155724' }}>
                          📞 Haydovchi: {order.driverPhone}
                        </div>
                      )}
                    </div>
                    <span className="m-list-item-arrow">→</span>
                  </div>

                  {/* Action buttons - matches Desktop */}
                  {isActive && (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--m-border)' }}>
                      {/* Find transport button */}
                      <button
                        className="m-btn m-btn-success"
                        onClick={(e) => handleFindTransport(e, order)}
                        style={{ flex: 2, fontSize: 13, padding: '8px 12px' }}
                      >
                        🚚 Mashina topish
                      </button>

                      {/* Broadcast button - only for internal dispatcher */}
                      {isInternalDispatcher && (
                        <button
                          className="m-btn"
                          onClick={(e) => handleOpenBroadcast(e, order)}
                          style={{ flex: 1, fontSize: 13, padding: '8px 12px', background: '#6f42c1', color: 'white' }}
                        >
                          📡
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        className="m-btn m-btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSheet({ open: true, order });
                        }}
                        style={{ padding: '8px 12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}

                  {/* Time */}
                  <div style={{ fontSize: 12, color: 'var(--m-text-muted)', marginTop: 8 }}>
                    {formatTimeAgo(order.createdTime || order.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </PullToRefresh>
      </main>

      {/* Delete confirmation sheet */}
      <BottomSheet
        isOpen={deleteSheet.open}
        onClose={() => setDeleteSheet({ open: false, order: null })}
        title="Buyurtmani o'chirish"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
          <p style={{ fontSize: 16, color: 'var(--m-text)', marginBottom: 24 }}>
            Haqiqatan ham o'chirmoqchimisiz?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="m-btn m-btn-secondary m-btn-lg"
              style={{ flex: 1 }}
              onClick={() => setDeleteSheet({ open: false, order: null })}
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

      {/* Broadcast sheet */}
      <BottomSheet
        isOpen={broadcastSheet.open}
        onClose={() => {
          if (!broadcasting) {
            setBroadcastSheet({ open: false, order: null });
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
          {!broadcastId && (
            <>
              <div className="m-form-group">
                <label className="m-form-label">Xabar matni</label>
                <textarea
                  className="m-form-textarea"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
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
                    Muvaffaqiyatli yuborildi: {broadcastStatus.groups_sent || 0} ta guruh
                  </p>
                </div>

                {broadcastStatus.status === 'in_progress' && (
                  <div style={{
                    marginTop: 12, height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: 3
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: '#6f42c1',
                      width: broadcastStatus.total_groups > 0
                        ? `${((broadcastStatus.groups_sent || 0) / broadcastStatus.total_groups) * 100}%`
                        : '0%',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                )}
              </div>

              <button
                className="m-btn m-btn-primary m-btn-full m-btn-lg"
                onClick={() => {
                  setBroadcastSheet({ open: false, order: null });
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

      <BottomSheet
        isOpen={needSheetOpen}
        onClose={() => setNeedSheetOpen(false)}
        title="Yukchi ehtiyoji"
      >
        <CargoOwnerNeedProfileCard
          profile={needProfile}
          staticData={staticData}
          compact
          saving={savingNeedProfile}
          onSave={handleSaveNeedProfile}
          onFindTransports={handleFindTransportFromNeed}
        />
      </BottomSheet>
    </>
  );
}
