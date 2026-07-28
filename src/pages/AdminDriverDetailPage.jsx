import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  adminGetDriver,
  adminGetDriverOffers,
  adminCreateHarbingerForUser,
  adminDeleteHarbinger,
  adminCreateTransportForDriver,
  adminCreateOrderForOwner,
  adminDeleteDriver,
  adminAcceptOrderForDriver,
  adminUpdateUser,
  adminUpdateUserRole,
  adminListInternalDispatchers,
  adminAssignInternalDispatcher,
  adminRemoveInternalDispatcher,
  adminListTariffs,
  adminAssignUserTariff,
  adminCancelUserTariff,
  adminGetCargoOwnerNeedProfile,
  adminUpdateCargoOwnerNeedProfile,
  deleteOrder,
  getLocationsAndVehicles,
  getUserMe,
} from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import CargoOwnerNeedProfileCard from '../components/CargoOwnerNeedProfileCard';
import TariffStatusCard from '../components/TariffStatusCard';

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Haydovchi' },
  { value: 'logist', label: 'Logist' },
  { value: 'factory', label: 'Yuk egasi' },
  { value: 'not_selected', label: 'Tanlanmagan' },
];

const ROLE_LABELS_DETAIL = {
  driver: 'Haydovchi',
  logist: 'Logist',
  factory: 'Yuk egasi',
  not_selected: 'Tanlanmagan',
};

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('uz-UZ');
}

function stateLabel(state) {
  switch (state) {
    case 'accepted':
      return { label: '✅ Qabul qildi', color: '#1ba353' };
    case 'rejected':
      return { label: '🚫 Rad etdi', color: '#cc4444' };
    case 'viewed':
      return { label: '👁 Ko\'rdi', color: '#1976d2' };
    default:
      return { label: '📤 Yuborildi', color: '#888' };
  }
}

function roleLabel(role) {
  switch (role) {
    case 'driver':
      return 'Haydovchi';
    case 'factory':
      return 'Yuk egasi';
    case 'logist':
      return 'Logist';
    default:
      return 'Foydalanuvchi';
  }
}

function backPathForRole(role, mobile) {
  if (mobile) return '/mobile/admin/users';
  if (role === 'driver') return '/admin/drivers';
  if (role === 'factory') return '/admin/cargo-owners';
  return '/admin/users';
}

function shareTextForUser(user) {
  const label = roleLabel(user?.type).toLowerCase();
  if (user?.type === 'driver') {
    return `Salom ${user.name}!\nSizni YukBor platformasiga haydovchi sifatida ro'yxatga oldim.\n` +
      `Quyidagi linkni bosing — bot avtomatik tanib oladi:\n\n${user.deepLink}\n\n` +
      `Botda hech narsa qilmasangiz ham bo'ladi — sizga mos yuklar avtomatik kelaveradi.`;
  }
  if (user?.type === 'factory') {
    return `Salom ${user.name}!\nSizni YukBor platformasiga yuk egasi sifatida ro'yxatga oldim.\n` +
      `Quyidagi linkni bosing — bot avtomatik tanib oladi:\n\n${user.deepLink}\n\n` +
      `Keyin yuklaringizni platforma orqali boshqaramiz.`;
  }
  return `Salom ${user?.name || ''}!\nSizni YukBor platformasiga ${label} sifatida ro'yxatga oldim.\n` +
    `Quyidagi linkni bosing:\n\n${user?.deepLink || ''}`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString('ru-RU')} so'm` : 'Kelishiladi';
}

export default function AdminDriverDetailPage({ mobile = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [offers, setOffers] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [staticData, setStaticData] = useState(null);
  const [needProfile, setNeedProfile] = useState(null);
  const [internalDispatchers, setInternalDispatchers] = useState([]);
  const [dispatcherChoice, setDispatcherChoice] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [showHarbingerModal, setShowHarbingerModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showOwnerOrderModal, setShowOwnerOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingDispatcher, setSavingDispatcher] = useState(false);
  const [savingNeedProfile, setSavingNeedProfile] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getUserMe();
        if (me.code === 200 && me.result) setIsAdmin(me.result.isAdmin === true);
      } catch (e) {
        console.error(e);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, o, s, t, dispatcherResponse] = await Promise.all([
        adminGetDriver(id),
        adminGetDriverOffers(id),
        getLocationsAndVehicles(),
        adminListTariffs(true),
        adminListInternalDispatchers(),
      ]);
      if (d.code === 200) {
        setDriver(d.result);
        setDispatcherChoice(d.result?.assignedDispatcher?.id || '');
      }
      if (d.code === 200 && d.result?.type === 'factory') {
        try {
          const profileResponse = await adminGetCargoOwnerNeedProfile(id);
          if (profileResponse.code === 200) setNeedProfile(profileResponse.result);
        } catch (_) {
          setNeedProfile(null);
        }
      } else {
        setNeedProfile(null);
      }
      if (o.code === 200) setOffers(o.result || []);
      if (s.code === 200) setStaticData(s.result);
      if (t.code === 200) setTariffs(t.result || []);
      if (dispatcherResponse.code === 200) setInternalDispatchers(dispatcherResponse.result || []);
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  const handleCopyDeepLink = () => {
    if (!driver?.deepLink) return;
    navigator.clipboard.writeText(driver.deepLink);
    showSuccess("Link nusxalandi");
  };

  const handleShareTextCopy = () => {
    if (!driver) return;
    navigator.clipboard.writeText(shareTextForUser(driver));
    showSuccess("Tayyor habar nusxalandi");
  };

  const handleDelete = async () => {
    if (!confirm("Bu foydalanuvchini o'chirishga ishonchingiz komilmi?")) return;
    try {
      const r = await adminDeleteDriver(id);
      if (r.code === 200 && r.result) {
        showSuccess("O'chirildi");
        navigate(backPathForRole(driver?.type, mobile));
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    }
  };

  const handleChangeRole = async (newRole) => {
    if (!driver || newRole === driver.type) return;
    if (!confirm(`Rolni "${ROLE_LABELS_DETAIL[newRole] || newRole}" ga o'zgartirasizmi?`)) return;
    setSavingRole(true);
    try {
      const r = await adminUpdateUserRole(id, newRole);
      if (r.code === 200) {
        showSuccess("Rol o'zgartirildi");
        loadAll();
      } else {
        showError(r.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setSavingRole(false);
    }
  };

  const handleAssignDispatcher = async () => {
    if (!driver || !dispatcherChoice || dispatcherChoice === driver.assignedDispatcher?.id) return;
    const selected = internalDispatchers.find((item) => item.id === dispatcherChoice);
    if (!selected) {
      showError('Ichki logistni tanlang');
      return;
    }
    const action = driver.assignedDispatcher ? 'ko‘chirasizmi' : 'biriktirasizmi';
    if (!confirm(`${driver.name || roleLabel(driver.type)}ni ${selected.name}ga ${action}?`)) return;
    setSavingDispatcher(true);
    try {
      const response = await adminAssignInternalDispatcher(id, dispatcherChoice);
      if (response.code === 200 && response.result) {
        setDriver(response.result);
        setDispatcherChoice(response.result.assignedDispatcher?.id || '');
        showSuccess(driver.assignedDispatcher ? 'Boshqa ichki logistga ko‘chirildi' : 'Ichki logistga biriktirildi');
      } else {
        showError(response.message || 'Biriktirib bo‘lmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Biriktirib bo‘lmadi');
    } finally {
      setSavingDispatcher(false);
    }
  };

  const handleRemoveDispatcher = async () => {
    if (!driver?.assignedDispatcher) return;
    if (!confirm(`${driver.assignedDispatcher.name} bilan bog‘lanishni olib tashlaysizmi?`)) return;
    setSavingDispatcher(true);
    try {
      const response = await adminRemoveInternalDispatcher(id);
      if (response.code === 200 && response.result) {
        setDriver(response.result);
        setDispatcherChoice('');
        showSuccess('Ichki logistdan olib tashlandi');
      } else {
        showError(response.message || 'Bog‘lanishni olib tashlab bo‘lmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Bog‘lanishni olib tashlab bo‘lmadi');
    } finally {
      setSavingDispatcher(false);
    }
  };

  const handleManualAccept = async (orderId) => {
    if (!driver?.chatId || !orderId) return;
    if (!confirm("Bu yukni shu haydovchiga qo'lda biriktirasizmi?")) return;
    try {
      const r = await adminAcceptOrderForDriver(orderId, driver.chatId);
      if (r.code === 200) {
        showSuccess("Qabul qilindi");
        loadAll();
      } else {
        showError(r.message || "Xatolik");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    }
  };

  const handleDeleteOwnerOrder = async (orderId) => {
    if (!orderId) return;
    if (!confirm("Bu yukni o'chirasizmi?")) return;
    try {
      const r = await deleteOrder(orderId);
      if (r.code === 200) {
        showSuccess("Yuk o'chirildi");
        loadAll();
      } else {
        showError(r.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    }
  };

  const handleDeleteHarbinger = async (harbingerId) => {
    if (!harbingerId) return;
    if (!confirm("Bu xabarchini o'chirasizmi?")) return;
    try {
      const r = await adminDeleteHarbinger(harbingerId);
      if (r.code === 200) {
        showSuccess("Xabarchi o'chirildi");
        loadAll();
      } else {
        showError(r.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    }
  };

  const handleCancelSubscription = async () => {
    if (!driver?.subscription) return;
    if (!confirm("Foydalanuvchining tarifini bekor qilasizmi?")) return;
    try {
      const r = await adminCancelUserTariff(id);
      if (r.code === 200) {
        showSuccess("Tarif bekor qilindi");
        loadAll();
      } else {
        showError(r.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    }
  };

  const handleSaveNeedProfile = async (payload) => {
    setSavingNeedProfile(true);
    try {
      const response = await adminUpdateCargoOwnerNeedProfile(id, payload);
      if (response.code === 200) {
        setNeedProfile(response.result);
        showSuccess('Yukchi ehtiyoji saqlandi');
      } else {
        showError(response.message || 'Ehtiyoj saqlanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Ehtiyoj saqlanmadi');
    } finally {
      setSavingNeedProfile(false);
    }
  };

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) {
    return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;
  }
  if (loading) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!driver) return <div style={{ padding: 24 }}>Foydalanuvchi topilmadi.</div>;

  const s = driver.stats || {};
  const acceptanceRate = s.sent > 0 ? Math.round((s.accepted / s.sent) * 100) : 0;
  const isDriver = driver.type === 'driver';
  const isCargoOwner = driver.type === 'factory';
  const canManageHarbingers = ['driver', 'logist'].includes(driver.type);
  const backPath = backPathForRole(driver.type, mobile);
  const ownerOrders = driver.ownerOrders || [];
  const activeOwnerOrders = ownerOrders.filter((order) => !['closed', 'cancelled', 'appointed'].includes(order.status)).length;
  const appointedOwnerOrders = ownerOrders.filter((order) => order.status === 'appointed').length;

  return (
    <div style={pageStyle}>
      <button onClick={() => navigate(backPath)} style={backBtnStyle}>
        ← Orqaga
      </button>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>{driver.name || '(ismsiz)'}</h2>
            <div style={{ color: '#666' }}>+{driver.phone}</div>
            <div style={{ marginTop: 6 }}>
              <span style={badge(driver.type === 'factory' ? '#558b2f' : driver.type === 'driver' ? '#1976d2' : '#7b1fa2')}>
                {roleLabel(driver.type)}
              </span>
            </div>
            {driver.telegramUsername && (
              <a href={`https://t.me/${driver.telegramUsername}`} target="_blank" rel="noreferrer" style={{ color: '#0088cc' }}>
                @{driver.telegramUsername}
              </a>
            )}
            {isDriver && driver.driverInfoUpdatedAt && (
              <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
                So&apos;nggi ma&apos;lumot yangilanishi: {fmtDate(driver.driverInfoUpdatedAt)} ·{' '}
                {driver.driverInfoUpdatedByName || driver.driverInfoUpdatedBy || 'noma\'lum foydalanuvchi'} tomonidan
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            {driver.isLinked ? (
              <span style={badge('#1ba353')}>✓ Botga ulangan</span>
            ) : (
              <span style={badge('#cc8800')}>⏳ Hali ulanmagan</span>
            )}
            <button onClick={() => setShowEditModal(true)} style={{ ...smallBtnStyle, fontSize: 12 }}>
              ✏️ Tahrirlash
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 10, background: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Rol:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleChangeRole(r.value)}
                disabled={savingRole}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: '1px solid #ccc',
                  cursor: savingRole ? 'wait' : 'pointer',
                  fontSize: 13,
                  background: driver.type === r.value ? '#1976d2' : '#fff',
                  color: driver.type === r.value ? '#fff' : '#333',
                  borderColor: driver.type === r.value ? '#1976d2' : '#ccc',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {(isDriver || isCargoOwner) && (
          <div style={dispatcherAssignmentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#24324a' }}>
                  Ichki logistga biriktirish
                </div>
                <div style={{ marginTop: 4, color: '#667085', fontSize: 12 }}>
                  {driver.assignedDispatcher
                    ? `Hozir: ${driver.assignedDispatcher.name} · +${driver.assignedDispatcher.phone}`
                    : `${roleLabel(driver.type)} hozircha hech kimga biriktirilmagan.`}
                </div>
              </div>
              {driver.assignedDispatcher && (
                <span style={badge(driver.assignedDispatcher.isActive ? '#1f8f5f' : '#b16b13')}>
                  {driver.assignedDispatcher.isActive ? '✓ Biriktirilgan' : '⚠ Logist huquqi olingan'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <select
                value={dispatcherChoice}
                onChange={(e) => setDispatcherChoice(e.target.value)}
                disabled={savingDispatcher}
                style={{ ...selectStyle, flex: '1 1 260px', marginBottom: 0 }}
              >
                <option value="">Ichki logistni tanlang</option>
                {internalDispatchers.map((dispatcher) => (
                  <option key={dispatcher.id} value={dispatcher.id}>
                    {dispatcher.name || 'Ismsiz'} · +{dispatcher.phone} · ID {dispatcher.chatId}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignDispatcher}
                disabled={
                  savingDispatcher ||
                  !dispatcherChoice ||
                  dispatcherChoice === driver.assignedDispatcher?.id
                }
                style={{
                  ...primaryBtnStyle,
                  opacity:
                    savingDispatcher ||
                    !dispatcherChoice ||
                    dispatcherChoice === driver.assignedDispatcher?.id
                      ? 0.55
                      : 1,
                }}
              >
                {savingDispatcher
                  ? 'Saqlanmoqda…'
                  : driver.assignedDispatcher
                    ? 'Boshqa logistga ko‘chirish'
                    : 'Biriktirish'}
              </button>
              {driver.assignedDispatcher && (
                <button
                  type="button"
                  onClick={handleRemoveDispatcher}
                  disabled={savingDispatcher}
                  style={dangerBtnCompactStyle}
                >
                  Olib tashlash
                </button>
              )}
            </div>
            {!internalDispatchers.length && (
              <div style={{ marginTop: 10, color: '#a15c00', fontSize: 12 }}>
                Ichki logistlar topilmadi. Avval foydalanuvchiga ichki logist huquqini bering.
              </div>
            )}
          </div>
        )}

        <SubscriptionBox
          driver={driver}
          tariffs={tariffs}
          onAssign={() => setShowSubscriptionModal(true)}
          onCancel={handleCancelSubscription}
        />

        {!driver.isLinked && driver.deepLink && (
          <div style={linkBoxStyle}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
              Bu linkni {roleLabel(driver.type).toLowerCase()}ga yuboring — u bossa bot avtomatik tanib oladi:
            </div>
            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', background: '#fff', padding: 8, borderRadius: 4, fontSize: 13 }}>
              {driver.deepLink}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button onClick={handleCopyDeepLink} style={smallBtnStyle}>
                📋 Linkni nusxalash
              </button>
              <button onClick={handleShareTextCopy} style={smallBtnStyle}>
                📨 Tayyor habarni nusxalash
              </button>
            </div>
          </div>
        )}

        {isDriver ? (
          <div style={statsBoxStyle}>
            <Stat label="Yuborilgan" value={s.sent ?? 0} />
            <Stat label="Ko'rgan" value={s.viewed ?? 0} />
            <Stat label="Qabul" value={s.accepted ?? 0} color="#1ba353" />
            <Stat label="Rad" value={s.rejected ?? 0} color="#cc4444" />
            <Stat label="Reaksiya yoq" value={s.noReaction ?? 0} color="#888" />
            <Stat label="Qabul %" value={`${acceptanceRate}%`} color={acceptanceRate >= 50 ? '#1ba353' : '#cc8800'} />
          </div>
        ) : (
          <div style={statsBoxStyle}>
            <Stat label="Jami yuklar" value={driver.ordersCount ?? ownerOrders.length} color="#558b2f" />
            <Stat label="Aktiv yuklar" value={activeOwnerOrders} color="#1976d2" />
            <Stat label="Biriktirilgan" value={appointedOwnerOrders} color="#1ba353" />
            <Stat label="Tarif" value={driver.subscription?.isActive ? 'Faol' : 'Yoq'} color={driver.subscription?.isActive ? '#1ba353' : '#888'} />
          </div>
        )}
      </div>

      {isDriver && (
        <>
          {/* Transport */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Transport</h3>
              {driver.isLinked && (
                <button onClick={() => setShowTransportModal(true)} style={smallBtnStyle}>
                  {driver.transport ? 'O\'zgartirish' : '+ Qo\'shish'}
                </button>
              )}
            </div>
            {driver.transport ? (
              <div style={{ marginTop: 8, fontSize: 14, color: '#444' }}>
                <div>📍 {driver.transport.loc1 || '—'}</div>
                <div>🚛 {driver.transport.vehicleType || '—'}</div>
                <div>⚖️ {driver.transport.maxWeight ? `${driver.transport.maxWeight} tonna` : '—'}</div>
                {driver.transport.stateNumber && <div>🔢 {driver.transport.stateNumber}</div>}
              </div>
            ) : (
              <div style={{ color: '#888', marginTop: 8 }}>Transport hali kiritilmagan.</div>
            )}
          </div>

          {/* Offers history */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Takliflar tarixi ({offers.length})</h3>
            {offers.length === 0 ? (
              <div style={{ color: '#888' }}>Hozircha hech qanday taklif yuborilmagan.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offers.map((o) => {
                  const lbl = stateLabel(o.state);
                  const ord = o.order;
                  return (
                    <div key={o.id} style={offerRowStyle}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Order ma'lumoti yoki "o'chib ketgan" */}
                        {o.orderDeleted ? (
                          <div style={{ color: '#999', fontSize: 13, fontStyle: 'italic' }}>
                            🗑 Buyurtma o&apos;chib ketgan (48+ soat)
                          </div>
                        ) : ord ? (
                          <div style={{ fontSize: 14, marginBottom: 6 }}>
                            <div style={{ fontWeight: 600 }}>
                              🛣 {ord.loc1 || '—'} → {ord.loc2 || '—'}
                            </div>
                            <div style={{ color: '#555', fontSize: 13 }}>
                              {ord.weightKg ? `⚖️ ${ord.weightKg} ${ord.weightUnit || 't'} · ` : ''}
                              {ord.vehicleType ? `🚛 ${ord.vehicleType} · ` : ''}
                              {ord.priceUzs ? `💰 ${ord.priceUzs.toLocaleString('ru-RU')} so'm · ` : ''}
                              {ord.ownerPhone ? `📞 +${ord.ownerPhone}` : ''}
                            </div>
                            {ord.otherDesc && (
                              <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
                                ℹ️ {ord.otherDesc}
                              </div>
                            )}
                            {ord.status && ord.status !== 'new' && (
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                <span style={badge(ord.status === 'appointed' ? '#1ba353' : '#888')}>
                                  {ord.status === 'appointed' ? '✅ Biriktirilgan' : ord.status}
                                </span>
                                {ord.driverPhone && ord.driverId !== parseInt(driver.chatId, 10) && (
                                  <span style={{ color: '#888', marginLeft: 6 }}>
                                    ({ord.driverId === parseInt(driver.chatId, 10) ? 'Shu haydovchi' : `boshqa: +${ord.driverPhone}`})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                        <div style={{ fontSize: 12, color: '#888' }}>
                          Yuborilgan: {fmtDate(o.sentAt)}
                          {o.viewedAt ? ` · Ko'rgan: ${fmtDate(o.viewedAt)}` : ''}
                          {o.acceptedAt ? ` · Qabul: ${fmtDate(o.acceptedAt)}${o.acceptedByAdmin ? " (admin qo'lda)" : ''}` : ''}
                          {o.rejectedAt ? ` · Rad: ${fmtDate(o.rejectedAt)}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <span style={badge(lbl.color)}>{lbl.label}</span>
                        {!o.orderDeleted && o.state !== 'accepted' && o.state !== 'rejected' && (
                          <button onClick={() => handleManualAccept(o.orderId)} style={tinyBtnStyle}>
                            {"Qo'lda qabul qildirish"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {canManageHarbingers && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Xabarchilar ({driver.harbingers?.length ?? 0})</h3>
            {driver.isLinked && (
              <button onClick={() => setShowHarbingerModal(true)} style={smallBtnStyle}>
                + Yangi xabarchi
              </button>
            )}
          </div>
          {driver.harbingers && driver.harbingers.length > 0 ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {driver.harbingers.map((h) => (
                <div key={h.id} style={{ background: '#f9f9f9', padding: 10, borderRadius: 6, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div>🛣 {h.loc1 || '—'} → {h.loc2 || 'har qayoq'}</div>
                      <div>⚖️ {h.maxWeight?.value ? `${h.maxWeight.value} tonna gacha` : 'har qanday vazn'}</div>
                      <div style={{ color: '#777', fontSize: 12, marginTop: 3 }}>
                        {h.orderTypePreference === 'cargo_owner_only' ? 'Faqat yuk egasi' : 'Barcha buyurtmalar'}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteHarbinger(h.id)} style={dangerBtnCompactStyle}>
                      O&apos;chirish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#888', marginTop: 8 }}>Hozircha xabarchi yoq — mos yuklar yuborilmaydi.</div>
          )}
        </div>
      )}

      {isCargoOwner && (
        <>
          <CargoOwnerNeedProfileCard
            profile={needProfile}
            staticData={staticData}
            saving={savingNeedProfile}
            onSave={handleSaveNeedProfile}
          />

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0 }}>Yuklar ({driver.ordersCount ?? ownerOrders.length})</h3>
                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                  Yuk egasi nomidan yaratilgan va platformaga chiqarilgan yuklar.
                </div>
              </div>
	              {driver.isLinked ? (
	                <button onClick={() => setShowOwnerOrderModal(true)} style={smallBtnStyle}>
	                  + Yuk qo&apos;shish
	                </button>
	              ) : (
	                <span style={{ color: '#888', fontSize: 13 }}>Yuk qo&apos;shish uchun avval botga ulansin</span>
	              )}
            </div>

            {ownerOrders.length === 0 ? (
	              <div style={{ color: '#888', marginTop: 12 }}>Hozircha yuk qo&apos;shilmagan.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {ownerOrders.map((order) => (
                  <div key={order.id} style={offerRowStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>
                        {order.fromCity || '—'} → {order.toCity || '—'}
                      </div>
                      <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                        {order.cargoName || 'Yuk'} · {order.vehicleType || 'Mashina turi ko\'rsatilmagan'} · {order.weightKg ? `${order.weightKg} t` : 'vazn yo\'q'} · {formatMoney(order.priceUzs)}
                      </div>
                      <div style={{ color: '#777', fontSize: 12, marginTop: 4 }}>
                        {order.additionalPhone ? `Telefon: +${order.additionalPhone} · ` : ''}
                        {order.createdTime ? `Yaratildi: ${fmtDate(order.createdTime)}` : ''}
                      </div>
                      {order.description && (
                        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                          {order.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <span style={badge(order.status === 'appointed' ? '#1ba353' : '#1976d2')}>
                        {order.status === 'appointed' ? 'Biriktirilgan' : order.status || 'new'}
                      </span>
	                      <button onClick={() => handleDeleteOwnerOrder(order.id)} style={dangerBtnCompactStyle}>
	                        O&apos;chirish
	                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={handleDelete} style={dangerBtnStyle}>
          {`🗑 ${roleLabel(driver.type)}ni o'chirish`}
        </button>
      </div>

      {showEditModal && (
        <EditUserModal
          driver={driver}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadAll();
          }}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionModal
          userId={id}
          tariffs={tariffs}
          currentSubscription={driver.subscription}
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={() => {
            setShowSubscriptionModal(false);
            loadAll();
          }}
        />
      )}

      {canManageHarbingers && showHarbingerModal && (
        <HarbingerModal
          userId={id}
          staticData={staticData}
          onClose={() => setShowHarbingerModal(false)}
          onSuccess={() => {
            setShowHarbingerModal(false);
            loadAll();
          }}
        />
      )}

      {isDriver && showTransportModal && (
        <TransportModal
          driverId={id}
          driver={driver}
          staticData={staticData}
          onClose={() => setShowTransportModal(false)}
          onSuccess={() => {
            setShowTransportModal(false);
            loadAll();
          }}
        />
      )}

      {isCargoOwner && showOwnerOrderModal && (
        <OwnerOrderModal
          userId={id}
          owner={driver}
          staticData={staticData}
          onClose={() => setShowOwnerOrderModal(false)}
          onSuccess={() => {
            setShowOwnerOrderModal(false);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function SubscriptionBox({ driver, tariffs, onAssign, onCancel }) {
  const subscription = driver.subscription;
  const currentTariff = tariffs.find((tariff) => tariff.id === subscription?.tariffId);

  return (
    <TariffStatusCard
      user={driver}
      tariff={currentTariff}
      admin
      mobile={false}
      maxFeatures={6}
      onManage={onAssign}
      onCancel={subscription ? onCancel : null}
      style={{ marginTop: 12 }}
    />
  );
}

function SubscriptionModal({ userId, tariffs, currentSubscription, onClose, onSuccess }) {
  const isTariffActive = (tariff) => {
    if (tariff?.isActive === true || tariff?.active === true) return true;
    if (tariff?.isActive === false || tariff?.active === false) return false;
    return true;
  };
  const activeTariffs = tariffs.filter(isTariffActive);
  const initialTariffId = currentSubscription?.tariffId || activeTariffs[0]?.id || tariffs[0]?.id || '';
  const initialTariff = tariffs.find((tariff) => tariff.id === initialTariffId);
  const [tariffId, setTariffId] = useState(initialTariffId);
  const [durationDays, setDurationDays] = useState(initialTariff?.durationDays ? String(initialTariff.durationDays) : '');
  const [expiresDate, setExpiresDate] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedTariff = tariffs.find((tariff) => tariff.id === tariffId);
  const harbingerFeature = selectedTariff?.features?.createHarbinger;

  useEffect(() => {
    if (!selectedTariff) {
      setDurationDays('');
      return;
    }
    setDurationDays(selectedTariff.durationDays ? String(selectedTariff.durationDays) : '');
    setExpiresDate('');
  }, [selectedTariff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tariffId) {
      showError('Tarif tanlang');
      return;
    }
    setSaving(true);
    try {
      const payload = { tariffId };
      if (durationDays.trim()) payload.durationDays = Math.max(1, parseInt(durationDays, 10) || 1);
      if (expiresDate) payload.expiresAt = new Date(`${expiresDate}T23:59:59`).getTime();
      const response = await adminAssignUserTariff(userId, payload);
      if (response.code === 200) {
        showSuccess('Tarif biriktirildi');
        onSuccess();
      } else {
        showError(response.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={modalOverlayStyle}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={modalContentStyle}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Foydalanuvchiga tarif berish</h3>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Tarif
            <select value={tariffId} onChange={(e) => setTariffId(e.target.value)} style={selectStyle}>
              <option value="">Tanlang</option>
              {tariffs.map((tariff) => (
                <option key={tariff.id} value={tariff.id}>
                  {tariff.name} · {Number(tariff.priceUzs || 0).toLocaleString('ru-RU')} {tariff.currency}
                  {!isTariffActive(tariff) ? " (o'chirilgan)" : ''}
                </option>
              ))}
            </select>
          </label>

          {selectedTariff && (
            <div style={{ background: '#f5f7fb', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 10 }}>
              <div>Muddat: {selectedTariff.durationDays ? `${selectedTariff.durationDays} kun` : 'muddatsiz'}</div>
              <div>
                Xabarchi: {harbingerFeature?.enabled
                  ? (harbingerFeature.limit === null || harbingerFeature.limit === undefined ? 'cheksiz' : `${harbingerFeature.limit} ta`)
                  : 'yoqilmagan'}
              </div>
            </div>
          )}

          <label style={labelStyle}>
            Muddat override (kun)
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={durationDays}
              onChange={(e) => {
                setDurationDays(e.target.value.replace(/\D/g, ''));
                setExpiresDate('');
              }}
              style={inputStyle}
              placeholder="Bo'sh qoldirilsa tarif muddatidan foydalanadi"
            />
          </label>

          <label style={labelStyle}>
            Aniq tugash sanasi
            <input
              type="date"
              value={expiresDate}
              onChange={(e) => {
                setExpiresDate(e.target.value);
                if (e.target.value) setDurationDays('');
              }}
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={saving}>
              Bekor qilish
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={saving || !tariffId}>
              {saving ? 'Saqlanmoqda...' : 'Biriktirish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Harbinger Modal =====
function HarbingerModal({ userId, staticData, onClose, onSuccess }) {
  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [toCity, setToCity] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [orderTypePreference, setOrderTypePreference] = useState('any');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        fromLocation: fromCountry ? {
          countryId: parseInt(fromCountry) || 0,
          regionId: parseInt(fromRegion) || 0,
          cityId: parseInt(fromCity) || 0,
        } : null,
        toLocation: toCountry ? {
          countryId: parseInt(toCountry) || 0,
          regionId: parseInt(toRegion) || 0,
          cityId: parseInt(toCity) || 0,
        } : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
        orderTypePreference,
      };
      const r = await adminCreateHarbingerForUser(userId, data);
      if (r.code === 200) {
        showSuccess("Habarchi yaratildi");
        onSuccess();
      } else {
        showError(r.message || "Xatolik");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const countries = staticData?.countries || [];
  const regions = staticData?.regions?.filter((r) => r.countryId === parseInt(fromCountry)) || [];
  const cities = staticData?.cities?.filter((c) => c.regionId === parseInt(fromRegion)) || [];
  const toRegions = staticData?.regions?.filter((r) => r.countryId === parseInt(toCountry)) || [];
  const toCities = staticData?.cities?.filter((c) => c.regionId === parseInt(toRegion)) || [];
  const vehicleTypes = staticData?.vehicleTypes || [];

  return (
    <div
      style={modalOverlayStyle}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={modalContentStyle}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Yangi habarchi</h3>
        <form onSubmit={handleSubmit}>
          <fieldset style={fieldsetStyle}>
            <legend>Qayerdan</legend>
            <select value={fromCountry} onChange={(e) => { setFromCountry(e.target.value); setFromRegion(''); setFromCity(''); }} style={selectStyle}>
              <option value="">Mamlakat (ixtiyoriy)</option>
              {countries.map((c) => <option key={c.countryId} value={c.countryId}>{c.name}</option>)}
            </select>
            {fromCountry && (
              <select value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {regions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
              </select>
            )}
            {fromRegion && (
              <select value={fromCity} onChange={(e) => setFromCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {cities.map((c) => <option key={c.cityId} value={c.cityId}>{c.name}</option>)}
              </select>
            )}
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend>Qayerga</legend>
            <select value={toCountry} onChange={(e) => { setToCountry(e.target.value); setToRegion(''); setToCity(''); }} style={selectStyle}>
              <option value="">Mamlakat (ixtiyoriy)</option>
              {countries.map((c) => <option key={c.countryId} value={c.countryId}>{c.name}</option>)}
            </select>
            {toCountry && (
              <select value={toRegion} onChange={(e) => { setToRegion(e.target.value); setToCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {toRegions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
              </select>
            )}
            {toRegion && (
              <select value={toCity} onChange={(e) => setToCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {toCities.map((c) => <option key={c.cityId} value={c.cityId}>{c.name}</option>)}
              </select>
            )}
          </fieldset>

          <label style={labelStyle}>
            Mashina turi
            <select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)} style={selectStyle}>
              <option value="">Hammasi</option>
              {vehicleTypes.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            Maksimal vazn (tonna)
            <input type="number" step="0.1" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} style={inputStyle} placeholder="masalan: 5" />
          </label>

          <label style={labelStyle}>
            Yuk turi
            <select value={orderTypePreference} onChange={(e) => setOrderTypePreference(e.target.value)} style={selectStyle}>
              <option value="any">Hammasi</option>
              <option value="cargo_owner_only">Faqat yuk egasidan</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={saving}>
              Bekor qilish
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Transport Modal =====
function TransportModal({ driverId, driver, staticData, onClose, onSuccess }) {
  const [fromCountry, setFromCountry] = useState(driver?.transport?.fromLocation?.countryId?.toString() || '');
  const [fromRegion, setFromRegion] = useState(driver?.transport?.fromLocation?.regionId?.toString() || '');
  const [fromCity, setFromCity] = useState(driver?.transport?.fromLocation?.cityId?.toString() || '');
  const [vehicleTypeId, setVehicleTypeId] = useState(driver?.transport?.vehicleTypeId?.toString() || '');
  const [maxWeight, setMaxWeight] = useState(driver?.transport?.maxWeight?.toString() || '');
  const [stateNumber, setStateNumber] = useState(driver?.transport?.stateNumber || '');
  const [additionalContact, setAdditionalContact] = useState(driver?.transport?.additionalPhone || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        fromLocation: {
          countryId: parseInt(fromCountry) || 0,
          regionId: parseInt(fromRegion) || 0,
          cityId: parseInt(fromCity) || 0,
        },
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
        stateNumber: stateNumber || '',
        additionalContact: additionalContact || '',
      };
      const r = await adminCreateTransportForDriver(driverId, data);
      if (r.code === 200) {
        showSuccess("Transport saqlandi");
        onSuccess();
      } else {
        showError(r.message || "Xatolik");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const countries = staticData?.countries || [];
  const regions = staticData?.regions?.filter((r) => r.countryId === parseInt(fromCountry)) || [];
  const cities = staticData?.cities?.filter((c) => c.regionId === parseInt(fromRegion)) || [];
  const vehicleTypes = staticData?.vehicleTypes || [];

  return (
    <div
      style={modalOverlayStyle}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={modalContentStyle}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>{"Transport ma'lumoti"}</h3>
        <form onSubmit={handleSubmit}>
          <fieldset style={fieldsetStyle}>
            <legend>Asosiy joylashuv</legend>
            <select value={fromCountry} onChange={(e) => { setFromCountry(e.target.value); setFromRegion(''); setFromCity(''); }} style={selectStyle} required>
              <option value="">Mamlakat tanlang</option>
              {countries.map((c) => <option key={c.countryId} value={c.countryId}>{c.name}</option>)}
            </select>
            {fromCountry && (
              <select value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {regions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
              </select>
            )}
            {fromRegion && (
              <select value={fromCity} onChange={(e) => setFromCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {cities.map((c) => <option key={c.cityId} value={c.cityId}>{c.name}</option>)}
              </select>
            )}
          </fieldset>

          <label style={labelStyle}>
            Mashina turi
            <select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)} style={selectStyle} required>
              <option value="">Tanlang</option>
              {vehicleTypes.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Maksimal vazn (tonna)
            <input type="number" step="0.1" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} style={inputStyle} required />
          </label>
          <label style={labelStyle}>
            Davlat raqami
            <input type="text" value={stateNumber} onChange={(e) => setStateNumber(e.target.value)} style={inputStyle} placeholder="01A123BC" />
          </label>
          <label style={labelStyle}>
            {"Qo'shimcha telefon"}
            <input type="tel" value={additionalContact} onChange={(e) => setAdditionalContact(e.target.value)} style={inputStyle} placeholder="+998..." />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={saving}>
              Bekor qilish
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OwnerOrderModal({ userId, owner, staticData, onClose, onSuccess }) {
  const [cargoName, setCargoName] = useState('');
  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [toCity, setToCity] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [weight, setWeight] = useState('');
  const [priceUzs, setPriceUzs] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState(owner?.phone ? `+${owner.phone}` : '');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const countries = staticData?.countries || [];
  const fromRegions = staticData?.regions?.filter((r) => r.countryId === parseInt(fromCountry, 10)) || [];
  const fromCities = staticData?.cities?.filter((c) => c.regionId === parseInt(fromRegion, 10)) || [];
  const toRegions = staticData?.regions?.filter((r) => r.countryId === parseInt(toCountry, 10)) || [];
  const toCities = staticData?.cities?.filter((c) => c.regionId === parseInt(toRegion, 10)) || [];
  const vehicleTypes = staticData?.vehicleTypes || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromCountry || !toCountry || !cargoName.trim()) {
      showError('Yuk nomi, qayerdan va qayerga maydonlarini to\'ldiring');
      return;
    }
    setSaving(true);
    try {
      const data = {
        cargoName: cargoName.trim(),
        additionalPhone: additionalPhone.trim(),
        description: description.trim(),
        fromLocation: {
          countryId: parseInt(fromCountry, 10) || 0,
          regionId: parseInt(fromRegion, 10) || 0,
          cityId: parseInt(fromCity, 10) || 0,
        },
        toLocation: {
          countryId: parseInt(toCountry, 10) || 0,
          regionId: parseInt(toRegion, 10) || 0,
          cityId: parseInt(toCity, 10) || 0,
        },
        weight: weight ? parseFloat(weight) : null,
        priceUzs: priceUzs ? parseInt(priceUzs, 10) || 0 : 0,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId, 10) : null,
      };
      const response = await adminCreateOrderForOwner(userId, data);
      if (response.code === 200) {
        showSuccess('Yuk yaratildi va tarqatish boshlandi');
        onSuccess();
      } else {
        showError(response.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={modalOverlayStyle}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={modalContentStyle}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Yuk egasi uchun yuk qo&apos;shish</h3>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Yuk nomi
            <input
              type="text"
              value={cargoName}
              onChange={(e) => setCargoName(e.target.value)}
              style={inputStyle}
              placeholder="masalan: sement, mebel, uskunalar"
              required
            />
          </label>

          <fieldset style={fieldsetStyle}>
            <legend>Qayerdan</legend>
            <select value={fromCountry} onChange={(e) => { setFromCountry(e.target.value); setFromRegion(''); setFromCity(''); }} style={selectStyle} required>
              <option value="">Mamlakat tanlang</option>
              {countries.map((c) => <option key={c.countryId} value={c.countryId}>{c.name}</option>)}
            </select>
            {fromCountry && (
              <select value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {fromRegions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
              </select>
            )}
            {fromRegion && (
              <select value={fromCity} onChange={(e) => setFromCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {fromCities.map((c) => <option key={c.cityId} value={c.cityId}>{c.name}</option>)}
              </select>
            )}
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend>Qayerga</legend>
            <select value={toCountry} onChange={(e) => { setToCountry(e.target.value); setToRegion(''); setToCity(''); }} style={selectStyle} required>
              <option value="">Mamlakat tanlang</option>
              {countries.map((c) => <option key={c.countryId} value={c.countryId}>{c.name}</option>)}
            </select>
            {toCountry && (
              <select value={toRegion} onChange={(e) => { setToRegion(e.target.value); setToCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {toRegions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
              </select>
            )}
            {toRegion && (
              <select value={toCity} onChange={(e) => setToCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {toCities.map((c) => <option key={c.cityId} value={c.cityId}>{c.name}</option>)}
              </select>
            )}
          </fieldset>

          <label style={labelStyle}>
            Mashina turi
            <select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)} style={selectStyle}>
              <option value="">Hammasi</option>
              {vehicleTypes.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <label style={labelStyle}>
              Vazn (tonna)
              <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} placeholder="20" />
            </label>
            <label style={labelStyle}>
              Narx (so&apos;m)
              <input type="number" min="0" value={priceUzs} onChange={(e) => setPriceUzs(e.target.value)} style={inputStyle} placeholder="Kelishiladi" />
            </label>
          </div>

          <label style={labelStyle}>
            Telefon
            <input type="tel" value={additionalPhone} onChange={(e) => setAdditionalPhone(e.target.value)} style={inputStyle} placeholder="+998..." />
          </label>

          <label style={labelStyle}>
            Izoh
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Qo'shimcha ma'lumot" />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={saving}>
              Bekor qilish
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={saving}>
              {saving ? 'Yaratilmoqda...' : 'Yukni yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ driver, onClose, onSuccess }) {
  const [name, setName] = useState(driver?.name || '');
  const [phone, setPhone] = useState(driver?.phone ? `+${driver.phone}` : '');
  const [language, setLanguage] = useState(driver?.language || 'uz');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await adminUpdateUser(driver.id, { name, phone, language });
      if (r.code === 200) {
        showSuccess("Saqlandi");
        onSuccess();
      } else {
        showError(r.message || 'Xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={modalOverlayStyle}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={modalContentStyle}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>{"Foydalanuvchini tahrirlash"}</h3>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Ism
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
          </label>
          <label style={labelStyle}>
            Telefon
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} required />
          </label>
          <label style={labelStyle}>
            Til
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={selectStyle}>
              <option value="uz">{"O'zbekcha"}</option>
              <option value="ru">{"Русский"}</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={saving}>
              Bekor qilish
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: '1 1 100px', textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#222' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
    </div>
  );
}

// ===== Styles =====
const pageStyle = { maxWidth: 1100, margin: '0 auto', padding: 16 };
const cardStyle = {
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};
const linkBoxStyle = {
  marginTop: 12,
  padding: 12,
  background: '#f5f9ff',
  border: '1px solid #d0e3ff',
  borderRadius: 6,
};
const statsBoxStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 16,
  padding: 12,
  background: '#fafafa',
  borderRadius: 6,
};
const offerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 8,
  padding: 10,
  background: '#fafafa',
  borderRadius: 6,
  flexWrap: 'wrap',
};
const labelStyle = { display: 'block', marginBottom: 12, fontSize: 14, color: '#333' };
const fieldsetStyle = { border: '1px solid #ddd', borderRadius: 6, padding: 8, marginBottom: 12 };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const selectStyle = { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, marginBottom: 6, boxSizing: 'border-box' };
const primaryBtnStyle = { padding: '10px 16px', borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const secondaryBtnStyle = { padding: '10px 16px', borderRadius: 6, background: '#eee', color: '#333', border: '1px solid #ccc', cursor: 'pointer', fontSize: 14 };
const smallBtnStyle = { padding: '6px 12px', borderRadius: 4, background: '#f0f0f0', color: '#333', border: '1px solid #ccc', cursor: 'pointer', fontSize: 13 };
const dispatcherAssignmentStyle = { marginTop: 12, padding: 14, border: '1px solid #cfe0f7', borderRadius: 10, background: 'linear-gradient(135deg, #f5f9ff, #fff)' };
const tinyBtnStyle = { padding: '4px 8px', borderRadius: 4, background: '#fff', color: '#1976d2', border: '1px solid #1976d2', cursor: 'pointer', fontSize: 12 };
const dangerBtnStyle = { padding: '10px 16px', borderRadius: 6, background: '#cc4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 };
const dangerBtnCompactStyle = { padding: '6px 12px', borderRadius: 4, background: '#fff', color: '#b00020', border: '1px solid #f1c7cf', cursor: 'pointer', fontSize: 13 };
const backBtnStyle = { padding: '6px 12px', background: 'transparent', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: 14, marginBottom: 12 };
const badge = (color) => ({ padding: '4px 10px', borderRadius: 12, background: color, color: '#fff', fontSize: 12, whiteSpace: 'nowrap' });
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 };
const modalContentStyle = { background: '#fff', borderRadius: 8, padding: 20, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' };
