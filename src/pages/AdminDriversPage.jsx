import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  adminListUsers,
  adminCreateDriver,
  getUserMe,
} from '../services/api';
import { showSuccess, showError } from '../utils/toast';

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

const ROLE_LABELS = {
  driver: 'Haydovchi',
  logist: 'Logist',
  factory: 'Yuk egasi',
  not_selected: 'Tanlanmagan',
};

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
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPhone, setCreatePhone] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('driver');
  const [creating, setCreating] = useState(false);

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

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { filter, onlyMine, role };
      const trimmed = search.trim();
      if (trimmed) {
        if (/[0-9+]/.test(trimmed)) params.phone = trimmed;
        else params.name = trimmed;
      }
      const resp = await adminListUsers(params);
      if (resp.code === 200) {
        setDrivers(resp.result || []);
      } else {
        showError(resp.message || 'Yuklashda xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [filter, search, onlyMine, role]);

  useEffect(() => {
    if (isAdmin) loadDrivers();
  }, [isAdmin, loadDrivers]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (role && role !== defaultRole) next.set('role', role);
    else next.delete('role');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

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
      });
      if (resp.code === 200 && resp.result) {
        if (createRole && createRole !== 'driver') {
          await import('../services/api').then((m) => m.adminUpdateUserRole(resp.result.id, createRole));
        }
        showSuccess("Foydalanuvchi yaratildi");
        setShowCreateModal(false);
        setCreatePhone('');
        setCreateName('');
        setCreateRole('driver');
        const detailPath = mobile ? `/mobile/admin/users/${resp.result.id}` : `/admin/drivers/${resp.result.id}`;
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
        <h2 style={{ margin: 0, fontSize: 22 }}>
          {role === 'driver' ? 'Haydovchilar' : 'Foydalanuvchilar'}
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={primaryBtnStyle}
        >
          + Yangi foydalanuvchi
        </button>
      </div>

      <div style={filtersRowStyle}>
        <span style={{ fontSize: 12, color: '#888', alignSelf: 'center', marginRight: 4 }}>Rol:</span>
        {ROLE_FILTERS.map((rf) => (
          <button
            key={rf.key}
            onClick={() => setRole(rf.key)}
            style={{
              ...chipStyle,
              ...(role === rf.key ? activeChipStyle : {}),
            }}
          >
            {rf.label}
          </button>
        ))}
      </div>

      <div style={controlsStyle}>
        <input
          type="text"
          placeholder="Ism yoki telefon bo'yicha qidirish..."
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
        {FILTERS.map((f) => (
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

      {loading ? (
        <div style={{ padding: 24 }}>Yuklanmoqda...</div>
      ) : drivers.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
          Hozircha haydovchilar topilmadi.
        </div>
      ) : (
        <div style={listStyle}>
          {drivers.map((d) => (
            <DriverCard
              key={d.id}
              driver={d}
              onClick={() => navigate(mobile ? `/mobile/admin/users/${d.id}` : `/admin/drivers/${d.id}`)}
            />
          ))}
        </div>
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

function DriverCard({ driver, onClick }) {
  const s = driver.stats || {};
  const acceptanceRate = s.sent > 0 ? Math.round((s.accepted / s.sent) * 100) : 0;
  const userRole = driver.type || 'not_selected';
  return (
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={badgeStyle(roleColor(userRole))}>{ROLE_LABELS[userRole] || userRole}</span>
          {driver.isLinked ? (
            <span style={badgeStyle('#1ba353')}>✓ Ulangan</span>
          ) : (
            <span style={badgeStyle('#cc8800')}>⏳ Ulanmagan</span>
          )}
        </div>
      </div>
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
    </button>
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
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
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
