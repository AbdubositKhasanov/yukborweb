import React, { useEffect, useState } from 'react';
import {
  adminBlockPremiumOrderChat,
  adminDeletePremiumOrders,
  adminListPremiumOrders,
  adminUnblockPremiumOrderChat,
  getUserMe,
} from '../services/api';
import { showError, showSuccess } from '../utils/toast';

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ');
}

export default function AdminPremiumOrdersPage({ mobile = false }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [chatId, setChatId] = useState('');
  const [saving, setSaving] = useState('');

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

  const load = async (nextPage = page, chatIdOverride) => {
    setLoading(true);
    try {
      const effectiveChatId = chatIdOverride !== undefined ? chatIdOverride : chatId;
      const params = { page: nextPage, size: 20 };
      if (String(effectiveChatId || '').trim()) params.chatId = String(effectiveChatId).trim();
      const response = await adminListPremiumOrders(params);
      if (response.code === 200) {
        setData(response.result);
        setPage(response.result.page || 0);
      } else {
        showError(response.message || 'Premium yuklar yuklanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Premium yuklar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load(0);
  }, [isAdmin]);

  const applySearch = (e) => {
    e.preventDefault();
    load(0);
  };

  const deleteByScope = async (scope) => {
    const labels = {
      TODAY: 'bugungi',
      LAST_24H: "so'nggi 24 soatdagi",
      LAST_7D: "so'nggi 7 kundagi",
      ALL: 'barcha',
    };
    if (!confirm(`${labels[scope]} status=new premium yuklarni o'chirasizmi?`)) return;
    setSaving(scope);
    try {
      const response = await adminDeletePremiumOrders({ scope });
      if (response.code === 200) {
        showSuccess(`${response.result.deleted} ta yuk o'chirildi`);
        await load(0);
      } else {
        showError(response.message || "O'chirilmadi");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || "O'chirilmadi");
    } finally {
      setSaving('');
    }
  };

  const deleteCurrentChat = async (blockChatId = false) => {
    const target = data?.forensic?.chatId || Number(chatId);
    if (!target) return;
    const message = blockChatId
      ? `chatId=${target} premium yuklarini o'chirib, chatIdni bloklaysizmi?`
      : `chatId=${target} premium yuklarini o'chirasizmi?`;
    if (!confirm(message)) return;
    setSaving(blockChatId ? 'chatBlockDelete' : 'chatDelete');
    try {
      const response = await adminDeletePremiumOrders({ chatId: target, blockChatId });
      if (response.code === 200) {
        showSuccess(`${response.result.deleted} ta yuk o'chirildi${response.result.blocked ? ', chatId bloklandi' : ''}`);
        await load(0);
      } else {
        showError(response.message || "O'chirilmadi");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || "O'chirilmadi");
    } finally {
      setSaving('');
    }
  };

  const toggleBlock = async (blocked) => {
    const target = data?.forensic?.chatId || Number(chatId);
    if (!target) return;
    setSaving(blocked ? 'unblock' : 'block');
    try {
      const response = blocked
        ? await adminUnblockPremiumOrderChat(target)
        : await adminBlockPremiumOrderChat(target, 'premium orders admin block');
      if (response.code === 200 && response.result) {
        showSuccess(blocked ? 'Blokdan chiqarildi' : 'Bloklandi');
        await load(page);
      } else {
        showError(response.message || 'Amaliyot bajarilmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Amaliyot bajarilmadi');
    } finally {
      setSaving('');
    }
  };

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  const counts = data?.counts || {};
  const forensic = data?.forensic;

  return (
    <div style={{ ...pageStyle, padding: mobile ? '16px 12px 90px' : pageStyle.padding }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Premium yuklar</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>
            Bot manbali yuklarni ko'rish, forensic qilish va spamni tozalash.
          </p>
        </div>
        <button type="button" onClick={() => load(page)} style={secondaryBtnStyle}>Yangilash</button>
      </div>

      <div style={{ ...gridStyle, gridTemplateColumns: mobile ? '1fr' : gridStyle.gridTemplateColumns }}>
        <aside style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Nazorat</h3>
          <div style={statsGridStyle}>
            <Stat label="Jami" value={counts.total || 0} />
            <Stat label="Bugun" value={counts.today || 0} />
            <Stat label="24 soat" value={counts.last24h || 0} />
            <Stat label="7 kun" value={counts.last7d || 0} />
          </div>

          <form onSubmit={applySearch} style={{ display: 'grid', gap: 8, marginTop: 14 }}>
            <label style={labelStyle}>
              ChatId forensic/filter
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                style={inputStyle}
                placeholder="7751656738"
              />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" style={primaryBtnStyle}>Qidirish</button>
              <button type="button" style={secondaryBtnStyle} onClick={() => { setChatId(''); load(0, ''); }}>
                Tozalash
              </button>
            </div>
          </form>

          {forensic && (
            <div style={forensicStyle}>
              <div style={{ fontWeight: 800 }}>chatId={forensic.chatId}</div>
              <div>Jami: {forensic.totalOrders} · Premium: {forensic.premiumOrders}</div>
              <div>Holat: {forensic.blocked ? 'Bloklangan' : 'Faol'}</div>
              <div>Birinchi: {fmtDate(forensic.firstCreatedAt)}</div>
              <div>Oxirgi: {fmtDate(forensic.lastCreatedAt)}</div>
              {forensic.ownerUsername && <div>@{forensic.ownerUsername}</div>}
              {forensic.phones?.length > 0 && <div>Telefonlar: {forensic.phones.join(', ')}</div>}
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => deleteCurrentChat(false)} style={dangerBtnStyle} disabled={saving === 'chatDelete'}>
                  Faqat yuklarini o'chirish
                </button>
                <button type="button" onClick={() => deleteCurrentChat(true)} style={dangerBtnStyle} disabled={saving === 'chatBlockDelete'}>
                  Bloklash + o'chirish
                </button>
                <button type="button" onClick={() => toggleBlock(forensic.blocked)} style={secondaryBtnStyle}>
                  {forensic.blocked ? 'Blokdan chiqarish' : 'Bloklash'}
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <h4 style={{ margin: '0 0 8px' }}>Davr bo'yicha tozalash</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              <button type="button" onClick={() => deleteByScope('TODAY')} style={dangerBtnStyle} disabled={saving === 'TODAY'}>Bugungilar</button>
              <button type="button" onClick={() => deleteByScope('LAST_24H')} style={dangerBtnStyle} disabled={saving === 'LAST_24H'}>So'nggi 24 soat</button>
              <button type="button" onClick={() => deleteByScope('LAST_7D')} style={dangerBtnStyle} disabled={saving === 'LAST_7D'}>So'nggi 7 kun</button>
              <button type="button" onClick={() => deleteByScope('ALL')} style={dangerBtnStyle} disabled={saving === 'ALL'}>Hammasi status=new</button>
            </div>
          </div>
        </aside>

        <main style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>Ro'yxat</h3>
            <div style={{ color: '#64748b', fontSize: 13 }}>Jami: {data?.total || 0}</div>
          </div>

          {loading ? (
            <div style={{ marginTop: 12 }}>Yuklanmoqda...</div>
          ) : (data?.items || []).length === 0 ? (
            <div style={{ color: '#64748b', marginTop: 12 }}>Yuk topilmadi.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {data.items.map((order) => (
                <article key={order.id} style={orderRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong>{order.route}</strong>
                      <span style={badge(order.status === 'new' ? '#1ba353' : '#64748b')}>{order.status}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                      chatId={order.chatId} · {fmtDate(order.createdTime)}
                      {order.weight ? ` · ${order.weight}` : ''}
                      {order.vehicleType ? ` · ${order.vehicleType}` : ''}
                      {order.phone ? ` · ${order.phone}` : ''}
                    </div>
                    {order.originMessage && (
                      <div style={{ color: '#475569', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                        {order.originMessage}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={secondaryBtnStyle}
                    onClick={() => {
                      setChatId(String(order.chatId));
                      load(0, String(order.chatId));
                    }}
                  >
                    Forensic
                  </button>
                </article>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" style={secondaryBtnStyle} disabled={page <= 0} onClick={() => load(page - 1)}>
              Oldingi
            </button>
            <button type="button" style={secondaryBtnStyle} disabled={!data?.hasMore} onClick={() => load(page + 1)}>
              Keyingi
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', border: '1px solid #edf0f5', borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
    </div>
  );
}

const pageStyle = {
  padding: 24,
  maxWidth: 1220,
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 16,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 0.75fr) minmax(420px, 1.25fr)',
  gap: 16,
  alignItems: 'start',
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #edf0f5',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  color: '#334155',
  fontSize: 13,
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #d8dee9',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

const primaryBtnStyle = {
  border: 0,
  borderRadius: 6,
  background: '#1976d2',
  color: '#fff',
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 800,
};

const secondaryBtnStyle = {
  border: '1px solid #d8dee9',
  borderRadius: 6,
  background: '#fff',
  color: '#334155',
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 800,
};

const dangerBtnStyle = {
  ...secondaryBtnStyle,
  color: '#b00020',
  borderColor: '#f1c7cf',
};

const forensicStyle = {
  border: '1px solid #dbeafe',
  background: '#f8fbff',
  borderRadius: 8,
  padding: 12,
  marginTop: 14,
  display: 'grid',
  gap: 5,
  fontSize: 13,
};

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

const orderRowStyle = {
  border: '1px solid #edf0f5',
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
};

const badge = (color) => ({
  borderRadius: 999,
  background: `${color}18`,
  color,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 800,
});
