import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  adminListUsers,
  adminCreateDriver,
  adminListTariffs,
  adminSetInternalDispatcherStatus,
  getUserMe,
} from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import { formatSubscriptionShort, getTariffState } from '../components/TariffStatusCard';

const PAGE_SIZE = 20;

const FILTERS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'not_linked', label: 'Ulanmagan' },
  { key: 'linked', label: 'Ulangan' },
  { key: 'no_offers', label: 'Yuk olmagan' },
  { key: 'no_views', label: "Ko'rmagan" },
  { key: 'no_accepts', label: 'Qabul qilmagan' },
];

const ROLE_FILTERS = [
  { key: 'any', label: 'Hammasi' },
  { key: 'driver', label: 'Haydovchilar' },
  { key: 'logist', label: 'Logistlar' },
  { key: 'factory', label: 'Yuk egalari' },
  { key: 'not_selected', label: 'Tanlanmagan' },
];

const SUBSCRIPTION_FILTERS = [
  { key: 'all', label: 'Tarif: hammasi' },
  { key: 'active', label: 'Faol tarif' },
  { key: 'expired', label: 'Muddati tugagan' },
  { key: 'none', label: 'Tarifsiz' },
  { key: 'any', label: 'Tarif bor' },
];

const INTERNAL_DISPATCHER_FILTERS = [
  { key: 'all', label: 'Barcha foydalanuvchilar' },
  { key: 'internal', label: 'Ichki logistlar' },
  { key: 'regular', label: 'Ichki logist emas' },
];

const ROLE_LABELS = {
  driver: 'Haydovchi',
  logist: 'Logist',
  factory: 'Yuk egasi',
  not_selected: 'Tanlanmagan',
};

const CREATE_ROLE_FALLBACK = 'driver';

function normalizeCreateRole(role) {
  return ['driver', 'logist', 'factory', 'not_selected'].includes(role) ? role : CREATE_ROLE_FALLBACK;
}

function pageTitle(role) {
  if (role === 'driver') return 'Haydovchilar';
  if (role === 'factory') return 'Yuk egalari';
  if (role === 'logist') return 'Logistlar';
  return 'Foydalanuvchilar';
}

function detailPathForRole(role, id, mobile) {
  if (mobile) return `/mobile/admin/users/${id}`;
  if (role === 'driver') return `/admin/drivers/${id}`;
  if (role === 'factory') return `/admin/cargo-owners/${id}`;
  return `/admin/users/${id}`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const diff = Date.now() - timestamp;
  if (diff < 0) return new Date(timestamp).toLocaleDateString('uz-UZ');
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'hozir';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return new Date(timestamp).toLocaleDateString('uz-UZ');
}

export default function AdminDriversPage({ defaultRole = 'driver', mobile = false }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || defaultRole;
  const [role, setRole] = useState(initialRole);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalIsExact, setTotalIsExact] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [internalDispatcherFilter, setInternalDispatcherFilter] = useState('all');
  const [tariffId, setTariffId] = useState('');
  const [tariffs, setTariffs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const abortRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPhone, setCreatePhone] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState(normalizeCreateRole(initialRole));
  const [creating, setCreating] = useState(false);
  const [updatingInternalDispatcherId, setUpdatingInternalDispatcherId] = useState('');
  const showInternalDispatcherManagement = !mobile && defaultRole === 'any';

  useEffect(() => {
    (async () => {
      try {
        const me = await getUserMe();
        if (me.code === 200 && me.result) {
          setIsAdmin(me.result.isAdmin === true);
        }
      } catch (e) {
        console.error('me failed', e);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const response = await adminListTariffs(true);
        if (response.code === 200) setTariffs(response.result || []);
      } catch (e) {
        console.error('tariffs failed', e);
      }
    })();
  }, [isAdmin]);

  const loadPage = useCallback(async (pageNum, append) => {
    // Avvalgi so'rovni bekor qilish
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setLoadingMore(true); else setLoading(true);

    try {
      const params = {
        filter,
        onlyMine,
        role,
        internalDispatcher:
          internalDispatcherFilter === 'internal'
            ? true
            : internalDispatcherFilter === 'regular'
              ? false
              : undefined,
        subscriptionFilter,
        tariffId,
        page: pageNum,
        size: PAGE_SIZE,
      };
      const trimmed = debouncedSearch.trim();
      if (trimmed) {
        // 24 belgili hex — Mongo _id; raqamli — telefon yoki Telegram ID
        // (backend ikkalasini ham tekshiradi); qolgani — ism
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) params.id = trimmed;
        else if (/[0-9+]/.test(trimmed)) params.phone = trimmed;
        else params.name = trimmed;
      }
      const resp = await adminListUsers(params, controller.signal);
      // Bu so'rov bekor qilingan bo'lsa, response'ni tashlab yuboramiz
      if (controller.signal.aborted) return;
      if (resp.code === 200) {
        const result = resp.result || {};
        const items = result.items || [];
        setDrivers((prev) => (append ? [...prev, ...items] : items));
        setHasMore(result.hasMore === true);
        setTotal(typeof result.total === 'number' ? result.total : items.length);
        setTotalIsExact(result.totalIsExact !== false);
        setPage(pageNum);
      } else {
        showError(resp.message || 'Yuklashda xatolik');
      }
    } catch (e) {
      // Bekor qilingan so'rovlar — sukut
      if (axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') return;
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      if (controller === abortRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filter, debouncedSearch, onlyMine, role, internalDispatcherFilter, subscriptionFilter, tariffId]);

  // Filter o'zgarganda 0-page'dan boshlab yuklaymiz
  useEffect(() => {
    if (isAdmin) loadPage(0, false);
  }, [isAdmin, loadPage]);

  // Search debounce — har keystroke'da so'rov yubormaslik uchun
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (role && role !== defaultRole) next.set('role', role);
    else next.delete('role');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Sahifa unmount bo'lganda ham so'rovni bekor qilamiz
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) loadPage(page + 1, true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createPhone.trim() || !createName.trim()) {
      showError("Ism va telefon kiritilishi shart");
      return;
    }
    setCreating(true);
    try {
      const resp = await adminCreateDriver({
        phone: createPhone.trim(),
        name: createName.trim(),
        type: createRole,
      });
      if (resp.code === 200 && resp.result) {
        showSuccess("Foydalanuvchi yaratildi");
        setShowCreateModal(false);
        setCreatePhone('');
        setCreateName('');
        setCreateRole(normalizeCreateRole(role));
        const detailPath = detailPathForRole(resp.result.type || createRole, resp.result.id, mobile);
        navigate(detailPath);
      } else {
        showError(resp.message || 'Yaratishda xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setCreateRole(normalizeCreateRole(role));
    setShowCreateModal(true);
  };

  const handleRoleFilter = (nextRole) => {
    setRole(nextRole);
    if (nextRole !== 'driver' && !['all', 'not_linked', 'linked'].includes(filter)) {
      setFilter('all');
    }
  };

  const handleSubscriptionFilter = (nextFilter) => {
    setSubscriptionFilter(nextFilter);
    if (nextFilter === 'none') setTariffId('');
  };

  const handleInternalDispatcherFilter = (nextFilter) => {
    setInternalDispatcherFilter(nextFilter);
    if (nextFilter === 'internal') setOnlyMine(false);
  };

  const handleInternalDispatcherStatus = async (user) => {
    const enabled = user.isInternalDispatcher !== true;
    if (enabled && user.type !== 'logist') {
      showError('Avval foydalanuvchi rolini Logist qilib o‘zgartiring');
      return;
    }
    if (enabled && !user.isLinked) {
      showError('Ichki logist qilish uchun foydalanuvchi avval botga ulanishi kerak');
      return;
    }
    const question = enabled
      ? `${user.name || 'Foydalanuvchi'}ga ichki logist huquqini berasizmi?`
      : `${user.name || 'Foydalanuvchi'}dan ichki logist huquqini olib tashlaysizmi? Biriktirilgan kontragentlar o‘chmaydi.`;
    if (!window.confirm(question)) return;
    setUpdatingInternalDispatcherId(user.id);
    try {
      const response = await adminSetInternalDispatcherStatus(user.id, enabled);
      if (response.code !== 200) throw new Error(response.message || 'Status o‘zgarmadi');
      showSuccess(enabled ? 'Ichki logist huquqi berildi' : 'Ichki logist huquqi olib tashlandi');
      await loadPage(0, false);
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Statusni o‘zgartirib bo‘lmadi');
    } finally {
      setUpdatingInternalDispatcherId('');
    }
  };

  if (!authChecked) {
    return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  }
  if (!isAdmin) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#c00' }}>
        Bu sahifa faqat adminlar uchun.
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>
            {pageTitle(role)}
          </h2>
          {!loading && (
            <span style={{ fontSize: 14, color: '#666' }}>
              {totalIsExact ? `${total} ta` : `${total}+ ta`} natija
            </span>
          )}
        </div>
        <button
          onClick={openCreateModal}
          style={primaryBtnStyle}
        >
          + Yangi {role === 'factory' ? 'yuk egasi' : role === 'driver' ? 'haydovchi' : 'foydalanuvchi'}
        </button>
      </div>

      <div style={filtersRowStyle}>
        <span style={{ fontSize: 12, color: '#888', alignSelf: 'center', marginRight: 4 }}>Rol:</span>
        {ROLE_FILTERS.map((rf) => (
          <button
            key={rf.key}
            onClick={() => handleRoleFilter(rf.key)}
            style={{
              ...chipStyle,
              ...(role === rf.key ? activeChipStyle : {}),
            }}
          >
            {rf.label}
          </button>
        ))}
      </div>

      {showInternalDispatcherManagement && (
        <section style={internalDispatcherPanelStyle}>
          <div style={{ minWidth: 210 }}>
            <strong style={{ display: 'block', color: '#24324a', fontSize: 14 }}>
              Ichki logistlar boshqaruvi
            </strong>
            <span style={{ color: '#667085', fontSize: 12 }}>
              Filterlang va Logist kartasidan huquqni bering yoki olib tashlang.
            </span>
          </div>
          <div style={{ ...filtersRowStyle, marginBottom: 0 }}>
            {INTERNAL_DISPATCHER_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleInternalDispatcherFilter(item.key)}
                style={{
                  ...chipStyle,
                  ...(internalDispatcherFilter === item.key ? activeInternalChipStyle : {}),
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div style={controlsStyle}>
        <input
          type="text"
          placeholder="Ism, telefon yoki ID bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          Faqat menikilar
        </label>
      </div>

      <div style={filtersRowStyle}>
        {(role === 'driver' ? FILTERS : FILTERS.filter((f) => ['all', 'not_linked', 'linked'].includes(f.key))).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              ...chipStyle,
              ...(filter === f.key ? activeChipStyle : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={filtersRowStyle}>
        {SUBSCRIPTION_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => handleSubscriptionFilter(sf.key)}
            style={{
              ...chipStyle,
              ...(subscriptionFilter === sf.key ? activeChipStyle : {}),
            }}
          >
            {sf.label}
          </button>
        ))}
        <select
          value={tariffId}
          onChange={(e) => setTariffId(e.target.value)}
          disabled={subscriptionFilter === 'none'}
          style={{
            ...inputStyle,
            flex: '0 1 260px',
            minWidth: 220,
            padding: '7px 10px',
            opacity: subscriptionFilter === 'none' ? 0.55 : 1,
          }}
        >
          <option value="">Barcha tariflar</option>
          {tariffs.map((tariff) => (
            <option key={tariff.id} value={tariff.id}>
              {tariff.name}{tariff.isActive === false ? " (o'chirilgan)" : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 24 }}>Yuklanmoqda...</div>
      ) : drivers.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
          Hozircha {pageTitle(role).toLowerCase()} topilmadi.
        </div>
      ) : (
        <>
          <div style={listStyle}>
            {drivers.map((d) => (
              <DriverCard
                key={d.id}
                driver={d}
                onClick={() => navigate(detailPathForRole(d.type || role, d.id, mobile))}
                showInternalControls={showInternalDispatcherManagement}
                updatingInternalDispatcher={updatingInternalDispatcherId === d.id}
                onInternalDispatcherStatus={handleInternalDispatcherStatus}
              />
            ))}
          </div>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{ ...primaryBtnStyle, opacity: loadingMore ? 0.7 : 1 }}
              >
                {loadingMore ? 'Yuklanmoqda...' : 'Yana yuklash'}
              </button>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setShowCreateModal(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowCreateModal(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            style={modalContentStyle}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Yangi foydalanuvchi</h3>
            <form onSubmit={handleCreate}>
              <label style={labelStyle}>
                Ism
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  style={inputStyle}
                  placeholder="Aliyev Ali"
                  required
                />
              </label>
              <label style={labelStyle}>
                Telefon
                <input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  style={inputStyle}
                  placeholder="+998901234567"
                  required
                />
              </label>
              <label style={labelStyle}>
                Rol
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  style={inputStyle}
                >
                  <option value="driver">Haydovchi</option>
                  <option value="logist">Logist</option>
                  <option value="factory">Yuk egasi</option>
                  <option value="not_selected">Tanlanmagan</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={secondaryBtnStyle}
                  disabled={creating}
                >
                  Bekor qilish
                </button>
                <button type="submit" style={primaryBtnStyle} disabled={creating}>
                  {creating ? 'Yaratilmoqda...' : 'Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DriverCard({
  driver,
  onClick,
  showInternalControls = false,
  updatingInternalDispatcher = false,
  onInternalDispatcherStatus,
}) {
  const s = driver.stats || {};
  const acceptanceRate = s.sent > 0 ? Math.round((s.accepted / s.sent) * 100) : 0;
  const userRole = driver.type || 'not_selected';
  const isDriver = userRole === 'driver';
  const isCargoOwner = userRole === 'factory';
  const tariffState = getTariffState(driver.subscription);
  const tariffText = formatSubscriptionShort(driver.subscription);
  const showManageAction = showInternalControls && (userRole === 'logist' || driver.isInternalDispatcher);
  const canEnableInternalDispatcher = userRole === 'logist' && driver.isLinked;
  return (
    <article style={cardShellStyle}>
      <button type="button" style={cardBtnStyle} onClick={onClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {driver.name || '(ismsiz)'}
            </div>
            <div style={{ color: '#666', fontSize: 14 }}>+{driver.phone}</div>
            {driver.telegramUsername && (
              <div style={{ color: '#0088cc', fontSize: 13 }}>@{driver.telegramUsername}</div>
            )}
            <div style={{ color: tariffState.tone, fontSize: 13, marginTop: 4, fontWeight: 700 }}>
              Tarif: {tariffText}
            </div>
            {(isDriver || isCargoOwner) && (
              <div
                style={{
                  color: driver.assignedDispatcher ? '#1f6f50' : '#8a6670',
                  fontSize: 12,
                  marginTop: 5,
                  fontWeight: 700,
                }}
              >
                {driver.assignedDispatcher
                  ? `Ichki logist: ${driver.assignedDispatcher.name}`
                  : 'Ichki logistga biriktirilmagan'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            {driver.isInternalDispatcher && (
              <span style={badgeStyle('#0f8a62')}>Ichki logist</span>
            )}
            <span style={badgeStyle(roleColor(userRole))}>{ROLE_LABELS[userRole] || userRole}</span>
            <span style={badgeStyle(tariffState.tone)}>{tariffState.label}</span>
            {driver.isLinked ? (
              <span style={badgeStyle('#1ba353')}>✓ Ulangan</span>
            ) : (
              <span style={badgeStyle('#cc8800')}>⏳ Ulanmagan</span>
            )}
          </div>
        </div>
        {isDriver ? (
          <>
            <div style={statsRowStyle}>
              <Stat label="Yuborilgan" value={s.sent ?? 0} />
              <Stat label={"Ko'rgan"} value={s.viewed ?? 0} />
              <Stat label="Qabul" value={s.accepted ?? 0} highlight={acceptanceRate >= 50 ? '#1ba353' : null} />
              <Stat label="Rad" value={s.rejected ?? 0} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
              <span>Qabul foizi: {acceptanceRate}%</span>
              <span>Oxirgi taklif: {formatRelativeTime(s.lastSentAt)}</span>
            </div>
          </>
        ) : (
          <>
            <div style={statsRowStyle}>
              <Stat label={isCargoOwner ? 'Yuklari' : 'Yozuvlar'} value={driver.ordersCount ?? 0} highlight={isCargoOwner ? '#558b2f' : null} />
              <Stat label="Tarif" value={driver.subscription?.isActive ? 'Faol' : 'Yoq'} />
              <Stat label="Holat" value={driver.isLinked ? 'Ulangan' : 'Kutilmoqda'} />
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {isCargoOwner ? 'Yuk egasining yuklari va tarifini detail sahifada boshqarasiz.' : 'Foydalanuvchi profili detail sahifada boshqariladi.'}
            </div>
          </>
        )}
      </button>
      {showManageAction && (
        <div style={internalDispatcherActionStyle}>
          <div style={{ display: 'grid', gap: 3, flex: '1 1 220px' }}>
            <strong>{driver.isInternalDispatcher ? 'Ichki logist huquqi faol' : 'Oddiy logist'}</strong>
            <span>
              {driver.isInternalDispatcher
                ? 'Yukchilar, haydovchilar va reminder bo‘limlariga kiradi.'
                : canEnableInternalDispatcher
                  ? 'Ichki logist funksiyalariga ruxsat berish mumkin.'
                  : 'Huquq berish uchun foydalanuvchi botga ulanishi kerak.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onInternalDispatcherStatus(driver)}
            disabled={updatingInternalDispatcher || (!driver.isInternalDispatcher && !canEnableInternalDispatcher)}
            style={{
              ...internalDispatcherActionButtonStyle,
              ...(driver.isInternalDispatcher ? internalDispatcherRemoveButtonStyle : {}),
              opacity:
                updatingInternalDispatcher || (!driver.isInternalDispatcher && !canEnableInternalDispatcher)
                  ? 0.55
                  : 1,
            }}
          >
            {updatingInternalDispatcher
              ? 'Saqlanmoqda…'
              : driver.isInternalDispatcher
                ? 'Huquqni olib tashlash'
                : 'Ichki logist qilish'}
          </button>
        </div>
      )}
    </article>
  );
}

function roleColor(role) {
  switch (role) {
    case 'driver': return '#1976d2';
    case 'logist': return '#7b1fa2';
    case 'factory': return '#558b2f';
    default: return '#888';
  }
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: highlight || '#222' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#666' }}>{label}</div>
    </div>
  );
}

// ===== Styles =====
const pageStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '16px',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
  marginBottom: 16,
};

const controlsStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: 12,
};

const filtersRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginBottom: 16,
};

const chipStyle = {
  padding: '6px 12px',
  borderRadius: 16,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const activeChipStyle = {
  background: '#1976d2',
  color: '#fff',
  borderColor: '#1976d2',
};

const activeInternalChipStyle = {
  background: '#0f8a62',
  color: '#fff',
  borderColor: '#0f8a62',
};

const internalDispatcherPanelStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 16,
  padding: 14,
  border: '1px solid #cfe7dd',
  borderRadius: 10,
  background: 'linear-gradient(135deg, #f1fbf7, #fff)',
};

const inputStyle = {
  flex: 1,
  minWidth: 200,
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  marginBottom: 12,
  fontSize: 14,
  color: '#333',
};

const primaryBtnStyle = {
  padding: '10px 16px',
  borderRadius: 6,
  background: '#1976d2',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const secondaryBtnStyle = {
  padding: '10px 16px',
  borderRadius: 6,
  background: '#eee',
  color: '#333',
  border: '1px solid #ccc',
  cursor: 'pointer',
  fontSize: 14,
};

const listStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 12,
};

const cardBtnStyle = {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  padding: 12,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  transition: 'box-shadow 0.15s',
  textAlign: 'left',
  font: 'inherit',
  width: '100%',
};

const cardShellStyle = {
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  background: '#fff',
};

const internalDispatcherActionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 'auto',
  padding: '10px 12px',
  borderTop: '1px solid #dcebe5',
  background: '#f7fcfa',
  color: '#39564d',
  fontSize: 12,
};

const internalDispatcherActionButtonStyle = {
  padding: '7px 10px',
  border: '1px solid #0f8a62',
  borderRadius: 6,
  color: '#fff',
  background: '#0f8a62',
  cursor: 'pointer',
  fontWeight: 750,
  fontSize: 12,
};

const internalDispatcherRemoveButtonStyle = {
  borderColor: '#d7a3aa',
  color: '#a42e3c',
  background: '#fff',
};

const statsRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  borderTop: '1px solid #f0f0f0',
  borderBottom: '1px solid #f0f0f0',
  padding: '8px 0',
};

const badgeStyle = (color) => ({
  padding: '3px 8px',
  borderRadius: 12,
  background: color,
  color: '#fff',
  fontSize: 11,
  whiteSpace: 'nowrap',
});

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const modalContentStyle = {
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  maxWidth: 400,
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
};
