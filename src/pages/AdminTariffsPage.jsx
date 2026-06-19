import React, { useEffect, useMemo, useState } from 'react';
import {
  adminCreateTariff,
  adminDeleteTariff,
  adminListTariffFeatures,
  adminListTariffs,
  adminUpdateTariff,
  getUserMe,
} from '../services/api';
import { showError, showSuccess } from '../utils/toast';

const emptyForm = {
  id: null,
  name: '',
  description: '',
  priceUzs: '',
  currency: 'UZS',
  durationDays: '30',
  isActive: true,
  sortOrder: 0,
  features: {},
};

function money(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function toForm(tariff) {
  if (!tariff) return emptyForm;
  const features = {};
  Object.entries(tariff.features || {}).forEach(([key, value]) => {
    features[key] = {
      enabled: value.enabled === true,
      limit: value.limit ?? '',
      limitPeriod: value.limitPeriod || 'subscription',
    };
  });
  return {
    id: tariff.id,
    name: tariff.name || '',
    description: tariff.description || '',
    priceUzs: tariff.priceUzs ?? '',
    currency: tariff.currency || 'UZS',
    durationDays: tariff.durationDays ?? '',
    isActive: tariff.isActive !== false,
    sortOrder: tariff.sortOrder || 0,
    features,
  };
}

function formToPayload(form, featureDefs) {
  const features = {};
  featureDefs.forEach((feature) => {
    const current = form.features?.[feature.key] || {};
    features[feature.key] = {
      enabled: current.enabled === true,
      limit: feature.supportsLimit && current.limit !== '' && current.limit !== null
        ? Math.max(0, parseInt(current.limit, 10) || 0)
        : null,
      limitPeriod: current.limitPeriod || 'subscription',
    };
  });
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    priceUzs: Math.max(0, parseInt(form.priceUzs, 10) || 0),
    currency: form.currency || 'UZS',
    durationDays: form.durationDays === '' ? null : Math.max(1, parseInt(form.durationDays, 10) || 1),
    isActive: form.isActive === true,
    sortOrder: parseInt(form.sortOrder, 10) || 0,
    features,
  };
}

export default function AdminTariffsPage({ mobile = false }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState([]);
  const [featureDefs, setFeatureDefs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const sortedTariffs = useMemo(() => {
    return [...tariffs].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.priceUzs || 0) - (b.priceUzs || 0));
  }, [tariffs]);

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

  const loadAll = async () => {
    setLoading(true);
    try {
      const [featuresRes, tariffsRes] = await Promise.all([
        adminListTariffFeatures(),
        adminListTariffs(true),
      ]);
      if (featuresRes.code === 200) setFeatureDefs(featuresRes.result || []);
      if (tariffsRes.code === 200) setTariffs(tariffsRes.result || []);
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Tariflar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const updateFeature = (key, patch) => {
    setForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: {
          enabled: false,
          limit: '',
          limitPeriod: 'subscription',
          ...(prev.features?.[key] || {}),
          ...patch,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showError('Tarif nomi kiritilishi shart');
      return;
    }
    setSaving(true);
    try {
      const payload = formToPayload(form, featureDefs);
      const response = form.id
        ? await adminUpdateTariff(form.id, payload)
        : await adminCreateTariff(payload);
      if (response.code === 200) {
        showSuccess(form.id ? "Tarif yangilandi" : "Tarif yaratildi");
        setForm(emptyForm);
        await loadAll();
      } else {
        showError(response.message || 'Saqlashda xatolik');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tariff) => {
    if (!confirm(`"${tariff.name}" tarifini o'chirasizmi?`)) return;
    try {
      const response = await adminDeleteTariff(tariff.id);
      if (response.code === 200 && response.result) {
        showSuccess("Tarif o'chirildi");
        if (form.id === tariff.id) setForm(emptyForm);
        await loadAll();
      } else {
        showError(response.message || "O'chirishda xatolik");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || "O'chirishda xatolik");
    }
  };

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  return (
    <div style={{ ...pageStyle, paddingBottom: mobile ? 90 : 32 }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Premium tariflar</h2>
          <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
            Bepul holatda xabarchi limiti 0 ta. Tarif orqali limit va muddat ochiladi.
          </div>
        </div>
        <button type="button" onClick={() => setForm(emptyForm)} style={secondaryBtnStyle}>
          + Yangi tarif
        </button>
      </div>

      {loading ? (
        <div style={cardStyle}>Yuklanmoqda...</div>
      ) : (
        <div style={{ ...gridStyle, gridTemplateColumns: mobile ? '1fr' : gridStyle.gridTemplateColumns }}>
          <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Tariflar</h3>
            {sortedTariffs.length === 0 ? (
              <div style={{ color: '#888' }}>Hali tarif yaratilmagan.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {sortedTariffs.map((tariff) => {
                  const harbinger = tariff.features?.createHarbinger;
                  return (
                    <div key={tariff.id} style={tariffRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong>{tariff.name}</strong>
                          <span style={badge(tariff.isActive ? '#1ba353' : '#888')}>
                            {tariff.isActive ? 'Faol' : "O'chirilgan"}
                          </span>
                        </div>
                        <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                          {money(tariff.priceUzs)} {tariff.currency} · {tariff.durationDays ? `${tariff.durationDays} kun` : 'muddatsiz'}
                        </div>
                        <div style={{ color: '#777', fontSize: 13, marginTop: 4 }}>
                          Xabarchi: {harbinger?.enabled ? (harbinger.limit === null || harbinger.limit === undefined ? 'cheksiz' : `${harbinger.limit} ta`) : 'yoqilmagan'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setForm(toForm(tariff))} style={tinyBtnStyle}>
                          Tahrirlash
                        </button>
                        <button type="button" onClick={() => handleDelete(tariff)} style={dangerTinyBtnStyle}>
                          O'chirish
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>{form.id ? 'Tarifni tahrirlash' : 'Yangi tarif'}</h3>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>
                Tarif nomi
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  placeholder="Masalan: Start"
                />
              </label>

              <label style={labelStyle}>
                Izoh
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                  placeholder="Tarif tavsifi"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={labelStyle}>
                  Narx (UZS)
                  <input
                    type="number"
                    value={form.priceUzs}
                    onChange={(e) => setForm({ ...form, priceUzs: e.target.value })}
                    style={inputStyle}
                    min="0"
                  />
                </label>
                <label style={labelStyle}>
                  Muddat (kun)
                  <input
                    type="number"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                    style={inputStyle}
                    min="1"
                    placeholder="Bo'sh = muddatsiz"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={labelStyle}>
                  Tartib
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', paddingTop: 26 }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Faol sotuvda
                </label>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Funksiyalar</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {featureDefs.map((feature) => {
                    const current = form.features?.[feature.key] || {};
                    return (
                      <div key={feature.key} style={featureRowStyle}>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={current.enabled === true}
                            onChange={(e) => updateFeature(feature.key, { enabled: e.target.checked })}
                            style={{ marginTop: 3 }}
                          />
                          <span>
                            <strong>{feature.label}</strong>
                            {feature.description && <span style={{ display: 'block', color: '#777', fontSize: 12 }}>{feature.description}</span>}
                          </span>
                        </label>
                        {feature.supportsLimit && (
                          <input
                            type="number"
                            value={current.limit ?? ''}
                            min="0"
                            onChange={(e) => updateFeature(feature.key, { limit: e.target.value })}
                            style={{ ...inputStyle, width: 120 }}
                            placeholder="Limit"
                            disabled={current.enabled !== true}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button type="submit" style={primaryBtnStyle} disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
                {form.id && (
                  <button type="button" onClick={() => setForm(emptyForm)} style={secondaryBtnStyle} disabled={saving}>
                    Bekor qilish
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  padding: 24,
  maxWidth: 1200,
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
  gridTemplateColumns: 'minmax(300px, 0.9fr) minmax(360px, 1.1fr)',
  gap: 16,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const tariffRowStyle = {
  border: '1px solid #eee',
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
};

const featureRowStyle = {
  border: '1px solid #eee',
  borderRadius: 8,
  padding: 10,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  alignItems: 'center',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 13,
  color: '#444',
  marginBottom: 10,
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

const primaryBtnStyle = {
  border: 0,
  borderRadius: 6,
  background: '#1976d2',
  color: '#fff',
  padding: '9px 14px',
  cursor: 'pointer',
  fontWeight: 700,
};

const secondaryBtnStyle = {
  border: '1px solid #ddd',
  borderRadius: 6,
  background: '#fff',
  color: '#333',
  padding: '9px 14px',
  cursor: 'pointer',
  fontWeight: 700,
};

const tinyBtnStyle = {
  border: '1px solid #ddd',
  borderRadius: 6,
  background: '#fff',
  color: '#333',
  padding: '6px 9px',
  cursor: 'pointer',
};

const dangerTinyBtnStyle = {
  ...tinyBtnStyle,
  color: '#b00020',
  borderColor: '#f1c7cf',
};

const badge = (color) => ({
  display: 'inline-block',
  background: color,
  color: '#fff',
  borderRadius: 12,
  padding: '2px 8px',
  fontSize: 12,
  fontWeight: 700,
});
