import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  adminGetDriver,
  adminGetDriverOffers,
  adminCreateHarbingerForDriver,
  adminCreateTransportForDriver,
  adminDeleteDriver,
  adminAcceptOrderForDriver,
  getLocationsAndVehicles,
  getUserMe,
} from '../services/api';
import { showSuccess, showError } from '../utils/toast';

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

export default function AdminDriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [offers, setOffers] = useState([]);
  const [staticData, setStaticData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [showHarbingerModal, setShowHarbingerModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);

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
      const [d, o, s] = await Promise.all([
        adminGetDriver(id),
        adminGetDriverOffers(id),
        getLocationsAndVehicles(),
      ]);
      if (d.code === 200) setDriver(d.result);
      if (o.code === 200) setOffers(o.result || []);
      if (s.code === 200) setStaticData(s.result);
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
    const txt =
      `Salom ${driver.name}!\nSizni YukBor platformasiga haydovchi sifatida ro'yxatga oldim.\n` +
      `Quyidagi linkni bosing — bot avtomatik tanib oladi:\n\n${driver.deepLink}\n\n` +
      `Botda hech narsa qilmasangiz ham bo'ladi — sizga mos yuklar avtomatik kelaveradi.`;
    navigator.clipboard.writeText(txt);
    showSuccess("Tayyor habar nusxalandi");
  };

  const handleDelete = async () => {
    if (!confirm("Bu haydovchini o'chirishga ishonchingiz komilmi?")) return;
    try {
      const r = await adminDeleteDriver(id);
      if (r.code === 200 && r.result) {
        showSuccess("O'chirildi");
        navigate('/admin/drivers');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xatolik');
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

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) {
    return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;
  }
  if (loading) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!driver) return <div style={{ padding: 24 }}>Haydovchi topilmadi.</div>;

  const s = driver.stats || {};
  const acceptanceRate = s.sent > 0 ? Math.round((s.accepted / s.sent) * 100) : 0;

  return (
    <div style={pageStyle}>
      <button onClick={() => navigate('/admin/drivers')} style={backBtnStyle}>
        ← Orqaga
      </button>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>{driver.name || '(ismsiz)'}</h2>
            <div style={{ color: '#666' }}>+{driver.phone}</div>
            {driver.telegramUsername && (
              <a href={`https://t.me/${driver.telegramUsername}`} target="_blank" rel="noreferrer" style={{ color: '#0088cc' }}>
                @{driver.telegramUsername}
              </a>
            )}
          </div>
          <div>
            {driver.isLinked ? (
              <span style={badge('#1ba353')}>✓ Botga ulangan</span>
            ) : (
              <span style={badge('#cc8800')}>⏳ Hali ulanmagan</span>
            )}
          </div>
        </div>

        {!driver.isLinked && driver.deepLink && (
          <div style={linkBoxStyle}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
              Bu linkni haydovchiga yuboring — u bossa bot avtomatik tanib oladi:
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

        <div style={statsBoxStyle}>
          <Stat label="Yuborilgan" value={s.sent ?? 0} />
          <Stat label="Ko'rgan" value={s.viewed ?? 0} />
          <Stat label="Qabul" value={s.accepted ?? 0} color="#1ba353" />
          <Stat label="Rad" value={s.rejected ?? 0} color="#cc4444" />
          <Stat label="Reaksiya yoq" value={s.noReaction ?? 0} color="#888" />
          <Stat label="Qabul %" value={`${acceptanceRate}%`} color={acceptanceRate >= 50 ? '#1ba353' : '#cc8800'} />
        </div>
      </div>

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

      {/* Habarchi */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Habarchilar ({driver.harbingers?.length ?? 0})</h3>
          {driver.isLinked && (
            <button onClick={() => setShowHarbingerModal(true)} style={smallBtnStyle}>
              + Yangi habarchi
            </button>
          )}
        </div>
        {driver.harbingers && driver.harbingers.length > 0 ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {driver.harbingers.map((h) => (
              <div key={h.id} style={{ background: '#f9f9f9', padding: 10, borderRadius: 6, fontSize: 14 }}>
                <div>🛣 {h.loc1 || '—'} → {h.loc2 || 'har qayoq'}</div>
                <div>⚖️ {h.maxWeight?.value ? `${h.maxWeight.value} tonna gacha` : 'har qanday vazn'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#888', marginTop: 8 }}>Hozircha habarchi yoq — yuk yuborilmaydi.</div>
        )}
      </div>

      {/* Offers history */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Takliflar tarixi ({offers.length})</h3>
        {offers.length === 0 ? (
          <div style={{ color: '#888' }}>Hozircha hech qanday taklif yuborilmagan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {offers.map((o) => {
              const lbl = stateLabel(o.state);
              return (
                <div key={o.id} style={offerRowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                      Order: {o.orderId.substring(0, 8)}…
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Yuborilgan: {fmtDate(o.sentAt)}
                      {o.viewedAt ? ` · Ko'rgan: ${fmtDate(o.viewedAt)}` : ''}
                      {o.acceptedAt ? ` · Qabul: ${fmtDate(o.acceptedAt)}${o.acceptedByAdmin ? ' (admin qo\'lda)' : ''}` : ''}
                      {o.rejectedAt ? ` · Rad: ${fmtDate(o.rejectedAt)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={badge(lbl.color)}>{lbl.label}</span>
                    {o.state !== 'accepted' && o.state !== 'rejected' && (
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

      <div style={{ marginTop: 16 }}>
        <button onClick={handleDelete} style={dangerBtnStyle}>
          {"🗑 Haydovchini o'chirish"}
        </button>
      </div>

      {showHarbingerModal && (
        <HarbingerModal
          driverId={id}
          staticData={staticData}
          onClose={() => setShowHarbingerModal(false)}
          onSuccess={() => {
            setShowHarbingerModal(false);
            loadAll();
          }}
        />
      )}

      {showTransportModal && (
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
    </div>
  );
}

// ===== Harbinger Modal =====
function HarbingerModal({ driverId, staticData, onClose, onSuccess }) {
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
      const r = await adminCreateHarbingerForDriver(driverId, data);
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
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {fromCountry && (
              <select value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {fromRegion && (
              <select value={fromCity} onChange={(e) => setFromCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend>Qayerga</legend>
            <select value={toCountry} onChange={(e) => { setToCountry(e.target.value); setToRegion(''); setToCity(''); }} style={selectStyle}>
              <option value="">Mamlakat (ixtiyoriy)</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {toCountry && (
              <select value={toRegion} onChange={(e) => { setToRegion(e.target.value); setToCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {toRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {toRegion && (
              <select value={toCity} onChange={(e) => setToCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {toCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {fromCountry && (
              <select value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromCity(''); }} style={selectStyle}>
                <option value="">Viloyat (ixtiyoriy)</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {fromRegion && (
              <select value={fromCity} onChange={(e) => setFromCity(e.target.value)} style={selectStyle}>
                <option value="">Shahar (ixtiyoriy)</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
const tinyBtnStyle = { padding: '4px 8px', borderRadius: 4, background: '#fff', color: '#1976d2', border: '1px solid #1976d2', cursor: 'pointer', fontSize: 12 };
const dangerBtnStyle = { padding: '10px 16px', borderRadius: 6, background: '#cc4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 };
const backBtnStyle = { padding: '6px 12px', background: 'transparent', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: 14, marginBottom: 12 };
const badge = (color) => ({ padding: '4px 10px', borderRadius: 12, background: color, color: '#fff', fontSize: 12, whiteSpace: 'nowrap' });
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 };
const modalContentStyle = { background: '#fff', borderRadius: 8, padding: 20, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' };
