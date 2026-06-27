import React, { useEffect, useState } from 'react';
import {
  adminCreateSenderBlacklist,
  adminDeleteSenderBlacklist,
  adminListSenderBlacklist,
  adminUpdateSenderBlacklist,
  getUserMe,
} from '../services/api';
import { showError, showSuccess } from '../utils/toast';

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('uz-UZ');
}

function sourceLabel(source) {
  switch (source) {
    case 'auto_profile':
      return 'Auto profil';
    case 'auto_classifier':
      return 'Auto classifier';
    case 'user_manual':
      return 'User belgilagan';
    case 'admin_manual':
      return 'Admin';
    default:
      return source || '-';
  }
}

function confirmationLabel(entry) {
  if (entry.adminConfirmed) return 'Admin tasdiqlagan';
  if (entry.userMarkedDispatcher) return 'Admin tasdiq kutmoqda';
  return 'Tasdiqlanmagan';
}

export default function AdminSenderBlacklistPage({ mobile = false }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ search: '', active: 'true', source: 'all', confirmation: 'all' });
  const [form, setForm] = useState({
    chatId: '',
    username: '',
    displayName: '',
    reason: '',
    active: true,
  });

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

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const params = {
        page: nextPage,
        size: 30,
        source: filters.source,
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.active !== 'all') params.active = filters.active;
      if (filters.confirmation !== 'all') params.confirmation = filters.confirmation;
      const response = await adminListSenderBlacklist(params);
      if (response.code === 200) {
        setData(response.result);
        setPage(response.result.page || 0);
      } else {
        showError(response.message || 'Blacklist yuklanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Blacklist yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load(0);
  }, [isAdmin]);

  const submitFilters = (event) => {
    event.preventDefault();
    load(0);
  };

  const addEntry = async (event) => {
    event.preventDefault();
    const chatId = form.chatId.trim() ? Number(form.chatId.trim()) : null;
    if (!chatId && !form.username.trim()) {
      showError('chatId yoki username kiriting');
      return;
    }
    setSaving('create');
    try {
      const response = await adminCreateSenderBlacklist({
        chatId,
        username: form.username.trim() || null,
        displayName: form.displayName.trim() || null,
        reason: form.reason.trim() || 'Admin qo‘lda qo‘shdi',
        active: form.active,
      });
      if (response.code === 200) {
        showSuccess('Blacklistga qo‘shildi');
        setForm({ chatId: '', username: '', displayName: '', reason: '', active: true });
        await load(0);
      } else {
        showError(response.message || 'Qo‘shilmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Qo‘shilmadi');
    } finally {
      setSaving('');
    }
  };

  const updateEntry = async (entry, patch) => {
    setSaving(entry.id);
    try {
      const response = await adminUpdateSenderBlacklist(entry.id, patch);
      if (response.code === 200) {
        showSuccess('Saqlandi');
        await load(page);
      } else {
        showError(response.message || 'Saqlanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Saqlanmadi');
    } finally {
      setSaving('');
    }
  };

  const editReason = (entry) => {
    const reason = window.prompt('Sabab', entry.reason || '');
    if (reason === null) return;
    updateEntry(entry, { reason });
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`${entry.username || entry.chatId || entry.id} blacklistdan butunlay o'chirilsinmi?`)) return;
    setSaving(entry.id);
    try {
      const response = await adminDeleteSenderBlacklist(entry.id);
      if (response.code === 200 && response.result) {
        showSuccess('O‘chirildi');
        await load(page);
      } else {
        showError(response.message || 'O‘chirilmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'O‘chirilmadi');
    } finally {
      setSaving('');
    }
  };

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  return (
    <div style={{ ...pageStyle, padding: mobile ? '16px 12px 90px' : pageStyle.padding }}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Dispetcher blacklist</h2>
          <p style={hintStyle}>
            Bu ro'yxat faqat Yuk egasi filterida ishlaydi. Active akkauntlar yuk egasi sifatida ko'rsatilmaydi.
            User belgilagan yozuvlar admin tasdiqlamaguncha ham blacklistda qoladi.
          </p>
        </div>
        <button type="button" onClick={() => load(page)} style={secondaryBtnStyle}>Yangilash</button>
      </header>

      <div style={{ ...layoutStyle, gridTemplateColumns: mobile ? '1fr' : layoutStyle.gridTemplateColumns }}>
        <aside style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Qidirish</h3>
          <form onSubmit={submitFilters} style={formGridStyle}>
            <label style={labelStyle}>
              Username, ism, sabab yoki chatId
              <input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                style={inputStyle}
                placeholder="logist yoki 7751656738"
              />
            </label>
            <label style={labelStyle}>
              Holat
              <select
                value={filters.active}
                onChange={(e) => setFilters((prev) => ({ ...prev, active: e.target.value }))}
                style={inputStyle}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="all">Hammasi</option>
              </select>
            </label>
            <label style={labelStyle}>
              Manba
              <select
                value={filters.source}
                onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
                style={inputStyle}
              >
                <option value="all">Hammasi</option>
                <option value="auto_profile">Auto profil</option>
                <option value="auto_classifier">Auto classifier</option>
                <option value="user_manual">User belgilagan</option>
                <option value="admin_manual">Admin</option>
              </select>
            </label>
            <label style={labelStyle}>
              Tasdiq
              <select
                value={filters.confirmation}
                onChange={(e) => setFilters((prev) => ({ ...prev, confirmation: e.target.value }))}
                style={inputStyle}
              >
                <option value="all">Hammasi</option>
                <option value="pending_user_reports">User belgilagan - tasdiq kutilmoqda</option>
                <option value="confirmed">Admin tasdiqlagan</option>
                <option value="unconfirmed">Tasdiqlanmagan</option>
              </select>
            </label>
            <button type="submit" style={primaryBtnStyle}>Qidirish</button>
          </form>

          <h3>Qo'lda qo'shish</h3>
          <form onSubmit={addEntry} style={formGridStyle}>
            <label style={labelStyle}>
              chatId
              <input
                value={form.chatId}
                onChange={(e) => setForm((prev) => ({ ...prev, chatId: e.target.value }))}
                style={inputStyle}
                placeholder="7751656738"
              />
            </label>
            <label style={labelStyle}>
              username
              <input
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                style={inputStyle}
                placeholder="@ali_logist"
              />
            </label>
            <label style={labelStyle}>
              Ism/profil nomi
              <input
                value={form.displayName}
                onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                style={inputStyle}
                placeholder="Ali Dispatch"
              />
            </label>
            <label style={labelStyle}>
              Sabab
              <textarea
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                style={{ ...inputStyle, minHeight: 76, resize: 'vertical' }}
                placeholder="Nima uchun blacklist?"
              />
            </label>
            <label style={{ ...labelStyle, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Active
            </label>
            <button type="submit" style={primaryBtnStyle} disabled={saving === 'create'}>
              {saving === 'create' ? 'Qo‘shilmoqda...' : 'Qo‘shish'}
            </button>
          </form>
        </aside>

        <main style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>Ro'yxat</h3>
            <span style={hintStyle}>Jami: {data?.total || 0}</span>
          </div>

          {loading ? (
            <div style={{ marginTop: 12 }}>Yuklanmoqda...</div>
          ) : (data?.items || []).length === 0 ? (
            <div style={{ marginTop: 12, color: '#64748b' }}>Yozuv topilmadi.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {data.items.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    ...rowStyle,
                    gridTemplateColumns: mobile ? '1fr' : rowStyle.gridTemplateColumns,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{entry.username ? `@${entry.username}` : `chatId=${entry.chatId}`}</strong>
                      <span style={badgeStyle(entry.active ? '#16a34a' : '#64748b')}>
                        {entry.active ? 'Active' : 'Inactive'}
                      </span>
                      <span style={badgeStyle('#2563eb')}>{sourceLabel(entry.source)}</span>
                      {entry.userMarkedDispatcher && (
                        <span style={badgeStyle('#9333ea')}>User belgilagan · {entry.manualReportsCount}</span>
                      )}
                      <span style={badgeStyle(entry.adminConfirmed ? '#0f766e' : (entry.userMarkedDispatcher ? '#d97706' : '#64748b'))}>
                        {confirmationLabel(entry)}
                      </span>
                    </div>
                    {entry.displayName && <div style={hintStyle}>{entry.displayName}</div>}
                    <div style={{ ...hintStyle, marginTop: 6 }}>{entry.reason}</div>
                    <div style={{ ...hintStyle, marginTop: 6 }}>
                      {entry.chatId ? `chatId=${entry.chatId} · ` : ''}
                      Yangilangan: {fmtDate(entry.updatedAt)}
                      {entry.lastManualReportedBy ? ` · reporter=${entry.lastManualReportedBy}` : ''}
                      {entry.adminConfirmedBy ? ` · admin=${entry.adminConfirmedBy}` : ''}
                    </div>
                    {entry.adminConfirmedAt && (
                      <div style={hintStyle}>Tasdiqlangan: {fmtDate(entry.adminConfirmedAt)}</div>
                    )}
                    {entry.triggerRules?.length > 0 && (
                      <div style={{ ...hintStyle, marginTop: 6 }}>
                        Rules: {entry.triggerRules.join(', ')}
                      </div>
                    )}
                    {entry.evidence && (
                      <pre style={evidenceStyle}>{entry.evidence}</pre>
                    )}
                  </div>
                  <div style={{ ...rowActionsStyle, flexDirection: mobile ? 'row' : 'column', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={secondaryBtnStyle}
                      disabled={saving === entry.id}
                      onClick={() => updateEntry(entry, { active: !entry.active })}
                    >
                      {entry.active ? 'O‘chirish' : 'Yoqish'}
                    </button>
                    <button
                      type="button"
                      style={entry.adminConfirmed ? secondaryBtnStyle : primaryBtnStyle}
                      disabled={saving === entry.id}
                      onClick={() => updateEntry(entry, { adminConfirmed: !entry.adminConfirmed })}
                    >
                      {entry.adminConfirmed ? 'Tasdiqni olish' : 'Tasdiqlash'}
                    </button>
                    <button type="button" style={secondaryBtnStyle} onClick={() => editReason(entry)}>
                      Sabab
                    </button>
                    <button type="button" style={dangerBtnStyle} onClick={() => deleteEntry(entry)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button type="button" style={secondaryBtnStyle} disabled={page === 0 || loading} onClick={() => load(page - 1)}>
              Oldingi
            </button>
            <span style={{ alignSelf: 'center', color: '#64748b' }}>Sahifa {page + 1}</span>
            <button type="button" style={secondaryBtnStyle} disabled={!data?.hasMore || loading} onClick={() => load(page + 1)}>
              Keyingi
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

const pageStyle = {
  padding: 24,
  maxWidth: 1180,
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 14,
};

const layoutStyle = {
  display: 'grid',
  gridTemplateColumns: '340px 1fr',
  gap: 14,
  alignItems: 'start',
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const formGridStyle = {
  display: 'grid',
  gap: 10,
};

const labelStyle = {
  display: 'grid',
  gap: 5,
  color: '#334155',
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d7dde5',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
};

const hintStyle = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
};

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 12,
  padding: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fbfdff',
};

const rowActionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const primaryBtnStyle = {
  border: 0,
  borderRadius: 8,
  padding: '10px 14px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
};

const secondaryBtnStyle = {
  border: '1px solid #d7dde5',
  borderRadius: 8,
  padding: '9px 12px',
  background: '#fff',
  color: '#334155',
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerBtnStyle = {
  ...secondaryBtnStyle,
  borderColor: '#fecaca',
  color: '#b91c1c',
};

const badgeStyle = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '3px 8px',
  background: `${color}14`,
  color,
  fontSize: 12,
  fontWeight: 800,
});

const evidenceStyle = {
  margin: '8px 0 0',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#f8fafc',
  color: '#475569',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: 1.45,
};
