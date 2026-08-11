import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminDeleteHarbinger, adminListHarbingers, getUserMe } from '../services/api';
import { showError, showSuccess } from '../utils/toast';

const PAGE_SIZE = 30;

const ROLE_FILTERS = [
  { value: 'all', label: 'Hammasi' },
  { value: 'driver', label: 'Haydovchilar' },
  { value: 'logist', label: 'Logistlar' },
  { value: 'factory', label: 'Yuk egalari' },
  { value: 'not_selected', label: 'Tanlanmagan' },
];

function roleLabel(role) {
  if (role === 'driver') return 'Haydovchi';
  if (role === 'factory') return 'Yuk egasi';
  if (role === 'logist') return 'Logist';
  return 'Foydalanuvchi';
}

function ownerPath(owner, mobile) {
  if (!owner?.id) return null;
  if (mobile) return `/mobile/admin/users/${owner.id}`;
  if (owner.type === 'driver') return `/admin/drivers/${owner.id}`;
  if (owner.type === 'factory') return `/admin/cargo-owners/${owner.id}`;
  return `/admin/users/${owner.id}`;
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('uz-UZ');
}

function formatWeight(harbinger) {
  const min = harbinger.minWeight?.value ? `${harbinger.minWeight.value} ${harbinger.minWeight.unit || 't'}` : null;
  const max = harbinger.maxWeight?.value ? `${harbinger.maxWeight.value} ${harbinger.maxWeight.unit || 't'}` : null;
  if (min || max) return [min, max].filter(Boolean).join(' - ');
  if (harbinger.weightOfCargo?.value) {
    return `${harbinger.weightOfCargo.value} ${harbinger.weightOfCargo.unit || 't'}`;
  }
  return 'Har qanday vazn';
}

function orderTypeLabel(value) {
  if (value === 'cargo_owner_only') return 'Faqat yuk egasi';
  if (value === 'logist_only') return 'Faqat logist';
  return 'Barcha buyurtmalar';
}

export default function AdminHarbingersPage({ mobile = false }) {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await getUserMe();
        if (response.code === 200 && response.result) {
          setIsAdmin(response.result.isAdmin === true);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPage = useCallback(
    async (nextPage, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await adminListHarbingers({
          search: debouncedSearch.trim(),
          role,
          page: nextPage,
          size: PAGE_SIZE,
        });
        if (response.code === 200) {
          const result = response.result || {};
          const nextItems = result.items || [];
          setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
          setPage(result.page || nextPage);
          setHasMore(result.hasMore === true);
          setTotal(result.total || nextItems.length);
          setActiveTotal(result.activeTotal ?? result.total ?? nextItems.length);
        } else {
          showError(response.message || 'Xabarchilar yuklanmadi');
        }
      } catch (error) {
        showError(error.response?.data?.message || error.message || 'Xatolik');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, role]
  );

  useEffect(() => {
    if (isAdmin) loadPage(0, false);
  }, [isAdmin, loadPage]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!confirm("Bu xabarchini o'chirasizmi?")) return;

    try {
      const response = await adminDeleteHarbinger(id);
      if (response.code === 200) {
        showSuccess("Xabarchi o'chirildi");
        loadPage(0, false);
      } else {
        showError(response.message || "O'chirilmadi");
      }
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Xatolik');
    }
  };

  const filterButtons = useMemo(
    () =>
      ROLE_FILTERS.map((item) => (
        <button key={item.value} type="button" onClick={() => setRole(item.value)} style={chipStyle(role === item.value)}>
          {item.label}
        </button>
      )),
    [role]
  );

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  return (
    <div style={{ ...pageStyle, padding: mobile ? '16px 12px 90px' : pageStyle.padding }}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Xabarchilar</h2>
          <p style={hintStyle}>Foydalanuvchilar yaratgan avtomatik yuk xabarchilarini boshqarish.</p>
        </div>
        <button type="button" style={secondaryBtnStyle} onClick={() => loadPage(0, false)} disabled={loading}>
          Yangilash
        </button>
      </header>

      <section style={toolbarStyle}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ism, telefon, chat ID yoki yo'nalish"
          style={inputStyle}
        />
        <div style={chipWrapStyle}>{filterButtons}</div>
      </section>

      <div style={summaryStyle}>
        Faol: <strong>{activeTotal}</strong> · Ro‘yxatda: <strong>{total}</strong>
      </div>

      {loading ? (
        <div style={cardStyle}>Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div style={cardStyle}>Xabarchilar topilmadi.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => {
            const harbinger = item.harbinger || {};
            const owner = item.owner;
            const path = ownerPath(owner, mobile);
            const isPaused = harbinger.status === 'paused_confirmation_required';
            const isActive = harbinger.status === 'new' || harbinger.status === 'active';
            return (
              <article key={harbinger.id} style={isPaused ? { ...cardStyle, borderColor: '#f59e0b' } : cardStyle}>
                <div style={itemHeaderStyle}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 16 }}>{harbinger.fullLoc1 || harbinger.loc1 || "Barcha yo'nalishlar"}</strong>
                    <div style={hintStyle}>
                      {formatWeight(harbinger)} · {orderTypeLabel(harbinger.orderTypePreference)}
                    </div>
                  </div>
                  <span
                    style={{
                      ...badgeStyle,
                      background: isActive ? '#ecfdf5' : '#fffbeb',
                      color: isActive ? '#047857' : '#92400e',
                    }}
                  >
                    {isPaused ? 'Tasdiq kutilmoqda' : isActive ? 'Faol' : 'To‘xtatilgan'}
                  </span>
                </div>

                <div style={detailsGridStyle}>
                  <div>
                    <span style={labelStyle}>Egasi</span>
                    <div>{owner ? `${owner.name || '(ismsiz)'} · ${roleLabel(owner.type)}` : `Chat ID: ${harbinger.chatId || '—'}`}</div>
                    {owner?.phone && <div style={hintStyle}>+{owner.phone}</div>}
                  </div>
                  <div>
                    <span style={labelStyle}>Yaratilgan</span>
                    <div>{formatDate(harbinger.createdTime)}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Buyurtma turi</span>
                    <div>{orderTypeLabel(harbinger.orderTypePreference)}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Xabarlar</span>
                    <div>Jami: {harbinger.offersCount || 0}</div>
                    <div style={hintStyle}>
                      Bosqich: {harbinger.confirmationCycleCount || 0}/{harbinger.confirmationBatchSize || 100}
                      {' · '}Soatlik: {harbinger.hourlyNotificationCount || 0}/{harbinger.hourlyNotificationLimit || 10}
                    </div>
                  </div>
                </div>

                {isPaused && (
                  <div
                    style={{
                      margin: '12px 0 0',
                      padding: 10,
                      borderRadius: 8,
                      background: '#fffbeb',
                      color: '#78350f',
                      fontSize: 13,
                    }}
                  >
                    Bu xabarchi foydalanuvchining davom ettirish tasdig‘ini kutmoqda va faol xabarchilar soniga kirmaydi.
                  </div>
                )}

                <div style={actionsStyle}>
                  {path && (
                    <button type="button" style={secondaryBtnStyle} onClick={() => navigate(path)}>
                      Egasini ochish
                    </button>
                  )}
                  <button type="button" style={dangerBtnStyle} onClick={() => handleDelete(harbinger.id)}>
                    O&apos;chirish
                  </button>
                </div>
              </article>
            );
          })}

          {hasMore && (
            <button
              type="button"
              style={{ ...secondaryBtnStyle, width: '100%', justifyContent: 'center' }}
              disabled={loadingMore}
              onClick={() => loadPage(page + 1, true)}
            >
              {loadingMore ? 'Yuklanmoqda...' : "Yana ko'rsatish"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  padding: 24,
  maxWidth: 1120,
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 14,
};

const hintStyle = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.45,
};

const toolbarStyle = {
  display: 'grid',
  gap: 10,
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
};

const inputStyle = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
};

const chipWrapStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const chipStyle = (active) => ({
  border: `1px solid ${active ? '#1976d2' : '#d1d5db'}`,
  background: active ? '#1976d2' : '#fff',
  color: active ? '#fff' : '#334155',
  borderRadius: 18,
  padding: '7px 12px',
  cursor: 'pointer',
  fontWeight: 700,
});

const summaryStyle = {
  color: '#475569',
  fontSize: 14,
  margin: '0 0 10px',
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const itemHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  marginBottom: 12,
};

const badgeStyle = {
  display: 'inline-flex',
  borderRadius: 18,
  padding: '4px 9px',
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 12,
  fontWeight: 800,
};

const detailsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  color: '#1f2937',
  fontSize: 14,
};

const labelStyle = {
  display: 'block',
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 3,
  textTransform: 'uppercase',
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 14,
};

const secondaryBtnStyle = {
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#334155',
  borderRadius: 8,
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 800,
};

const dangerBtnStyle = {
  ...secondaryBtnStyle,
  borderColor: '#fecaca',
  color: '#b91c1c',
  background: '#fff7f7',
};
