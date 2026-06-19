import React, { useEffect, useMemo, useState } from 'react';
import {
  adminCreateScheduledBroadcast,
  adminDeleteScheduledBroadcast,
  adminDuplicateScheduledBroadcast,
  adminListScheduledBroadcasts,
  adminSendScheduledBroadcastTest,
  adminUpdateScheduledBroadcast,
  getUserMe,
} from '../services/api';
import AdminMediaUpload from '../components/AdminMediaUpload';
import { showError, showSuccess } from '../utils/toast';

const userTypeOptions = [
  { value: 'logist', label: 'Logist' },
  { value: 'driver', label: 'Haydovchi' },
  { value: 'factory', label: 'Yuk egasi' },
  { value: 'not_selected', label: 'Tanlanmagan' },
];

const activityOptions = [
  { value: 'ALL', label: 'Hamma' },
  { value: 'INACTIVE_NO_LISTINGS', label: '0 yuk / 0 mashina' },
  { value: 'HAS_LISTINGS', label: 'Faollar' },
  { value: 'HAS_ORDERS', label: 'Yuk bergan' },
  { value: 'HAS_TRANSPORTS', label: 'Mashina qo‘shgan' },
];

const booleanOptions = [
  { value: '', label: 'Hamma' },
  { value: 'true', label: 'Ha' },
  { value: 'false', label: 'Yo‘q' },
];

function boolToSelect(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

function selectToBool(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function toForm(item) {
  if (!item) return null;
  return {
    name: item.name || '',
    enabled: item.enabled === true,
    frequency: item.frequency || 'DAILY',
    interval: item.interval || 1,
    startDate: item.startDate || new Date().toISOString().slice(0, 10),
    time: item.time || '09:00',
    weekDays: item.weekDays || [1, 2, 3, 4, 5, 6, 7],
    timezone: item.timezone || 'Asia/Tashkent',
    textTemplate: item.textTemplate || '',
    contentType: item.contentType || 'TEXT',
    mediaFileId: item.mediaFileId || '',
    parseMode: item.parseMode || 'HTML',
    targetFilter: {
      language: item.targetFilter?.language || '',
      userTypes: item.targetFilter?.userTypes || [],
      activity: item.targetFilter?.activity || 'ALL',
      phoneShared: boolToSelect(item.targetFilter?.phoneShared),
      internalDispatcher: boolToSelect(item.targetFilter?.internalDispatcher),
      premium: boolToSelect(item.targetFilter?.premium),
    },
    buttons: (item.buttons || []).map((button) => ({
      row: button.row || 0,
      text: button.text || '',
      type: button.type || 'CALLBACK',
      payload: button.payload || '',
    })),
  };
}

function formToPayload(form) {
  return {
    name: form.name.trim(),
    enabled: form.enabled === true,
    frequency: form.frequency,
    interval: Math.max(1, parseInt(form.interval, 10) || 1),
    startDate: form.startDate,
    time: form.time,
    weekDays: form.weekDays,
    timezone: form.timezone.trim() || 'Asia/Tashkent',
    textTemplate: form.textTemplate,
    contentType: form.contentType,
    mediaFileId: form.mediaFileId.trim() || null,
    parseMode: form.parseMode,
    targetFilter: {
      language: form.targetFilter.language || null,
      userTypes: form.targetFilter.userTypes || [],
      activity: form.targetFilter.activity || 'ALL',
      phoneShared: selectToBool(form.targetFilter.phoneShared),
      internalDispatcher: selectToBool(form.targetFilter.internalDispatcher),
      premium: selectToBool(form.targetFilter.premium),
    },
    buttons: (form.buttons || [])
      .filter((button) => button.text.trim() && button.payload.trim())
      .map((button) => ({
        row: Math.max(0, parseInt(button.row, 10) || 0),
        text: button.text.trim(),
        type: button.type || 'CALLBACK',
        payload: button.payload.trim(),
      })),
  };
}

export default function AdminBroadcastsPage({ mobile = false }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId],
  );

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

  const loadAll = async (preferredId = selectedId) => {
    setLoading(true);
    try {
      const response = await adminListScheduledBroadcasts();
      if (response.code === 200) {
        const nextItems = response.result || [];
        setItems(nextItems);
        const nextSelected = nextItems.find((item) => item.id === preferredId) || nextItems[0] || null;
        setSelectedId(nextSelected?.id || '');
        setForm(toForm(nextSelected));
      } else {
        showError(response.message || 'Broadcast rejalar yuklanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Broadcast rejalar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  useEffect(() => {
    if (selected) setForm(toForm(selected));
  }, [selectedId]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateTarget = (patch) => setForm((prev) => ({
    ...prev,
    targetFilter: { ...prev.targetFilter, ...patch },
  }));

  const toggleUserType = (value) => {
    const current = form.targetFilter.userTypes || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateTarget({ userTypes: next });
  };

  const updateButton = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.map((button, idx) => (idx === index ? { ...button, ...patch } : button)),
    }));
  };

  const addButton = () => {
    setForm((prev) => ({
      ...prev,
      buttons: [...(prev.buttons || []), { row: 0, text: '', type: 'CALLBACK', payload: '' }],
    }));
  };

  const removeButton = (index) => {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, idx) => idx !== index),
    }));
  };

  const createPlan = async () => {
    const name = prompt('Yangi broadcast nomi', 'Yangi reja');
    if (!name) return;
    try {
      const response = await adminCreateScheduledBroadcast({ name });
      if (response.code === 200) {
        showSuccess('Yangi reja yaratildi');
        await loadAll(response.result.id);
      } else {
        showError(response.message || 'Yaratilmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Yaratilmadi');
    }
  };

  const savePlan = async (e) => {
    e.preventDefault();
    if (!selected || !form) return;
    setSaving(true);
    try {
      const response = await adminUpdateScheduledBroadcast(selected.id, formToPayload(form));
      if (response.code === 200) {
        showSuccess('Broadcast reja saqlandi');
        await loadAll(response.result.id);
      } else {
        showError(response.message || 'Saqlanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  const duplicatePlan = async () => {
    if (!selected) return;
    try {
      const response = await adminDuplicateScheduledBroadcast(selected.id);
      if (response.code === 200) {
        showSuccess('Reja nusxalandi');
        await loadAll(response.result.id);
      } else {
        showError(response.message || 'Nusxalanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Nusxalanmadi');
    }
  };

  const deletePlan = async () => {
    if (!selected || !confirm(`"${selected.name}" rejasini o'chirasizmi?`)) return;
    try {
      const response = await adminDeleteScheduledBroadcast(selected.id);
      if (response.code === 200 && response.result) {
        showSuccess("Reja o'chirildi");
        await loadAll('');
      } else {
        showError(response.message || "O'chirilmadi. Kamida bitta reja qolishi kerak.");
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || "O'chirilmadi");
    }
  };

  const sendTest = async () => {
    if (!selected) return;
    try {
      const response = await adminSendScheduledBroadcastTest(selected.id);
      if (response.code === 200) {
        showSuccess(`Test yuborildi: ${response.result.sent}/${response.result.total}`);
      } else {
        showError(response.message || 'Test yuborilmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Test yuborilmadi');
    }
  };

  const handleMediaUploaded = async (media) => {
    if (!selected || !form) return;
    const nextForm = {
      ...form,
      contentType: media.contentType || form.contentType,
      mediaFileId: media.fileId,
    };
    setForm(nextForm);
    setSaving(true);
    try {
      const response = await adminUpdateScheduledBroadcast(selected.id, formToPayload(nextForm));
      if (response.code === 200) {
        showSuccess('Media yuklandi va reja saqlandi');
        await loadAll(response.result.id);
      } else {
        showError(response.message || 'Media yuklandi, lekin reja saqlanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Media yuklandi, lekin reja saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  return (
    <div style={{ ...pageStyle, padding: mobile ? '16px 12px 90px' : pageStyle.padding }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Rejalangan broadcast</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>
            Botdagi scheduled broadcast rejalari: audience, kontent, tugmalar va jadval.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => loadAll()} style={secondaryBtnStyle}>Yangilash</button>
          <button type="button" onClick={createPlan} style={primaryBtnStyle}>Yangi reja</button>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Yuklanmoqda...</div>
      ) : (
        <div style={{ ...gridStyle, gridTemplateColumns: mobile ? '1fr' : gridStyle.gridTemplateColumns }}>
          <aside style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Rejalar</h3>
            {items.length === 0 ? (
              <div style={{ color: '#64748b' }}>Hali reja yo'q.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      ...planButtonStyle,
                      borderColor: item.id === selected?.id ? '#9cc9ff' : '#e5e7eb',
                      background: item.id === selected?.id ? '#f0f7ff' : '#fff',
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{item.name}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      {item.enabled ? 'Faol' : "O'chirilgan"} · {item.targetCount} user · {item.time}
                    </span>
                    {item.validationError && <span style={{ color: '#b00020', fontSize: 12 }}>{item.validationError}</span>}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main style={cardStyle}>
            {!selected || !form ? (
              <div style={{ color: '#64748b' }}>Reja tanlang.</div>
            ) : (
              <form onSubmit={savePlan}>
                <div style={sectionHeaderStyle}>
                  <div>
                    <h3 style={{ margin: 0 }}>{selected.name}</h3>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                      Target: {selected.targetCount} user
                      {selected.lastSentSlot ? ` · Oxirgi slot: ${selected.lastSentSlot}` : ''}
                    </div>
                  </div>
                  <label style={switchLabelStyle}>
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => updateForm({ enabled: e.target.checked })}
                    />
                    Faol
                  </label>
                </div>

                {selected.validationError && (
                  <div style={warningStyle}>{selected.validationError}</div>
                )}

                <section style={fieldsetStyle}>
                  <h4 style={miniTitleStyle}>Jadval</h4>
                  <div style={twoColStyle(mobile)}>
                    <label style={labelStyle}>
                      Nomi
                      <input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>
                      Chastota
                      <select value={form.frequency} onChange={(e) => updateForm({ frequency: e.target.value })} style={inputStyle}>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Interval
                      <input type="number" min="1" value={form.interval} onChange={(e) => updateForm({ interval: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>
                      Vaqt
                      <input type="time" value={form.time} onChange={(e) => updateForm({ time: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>
                      Start sana
                      <input type="date" value={form.startDate} onChange={(e) => updateForm({ startDate: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>
                      Timezone
                      <input value={form.timezone} onChange={(e) => updateForm({ timezone: e.target.value })} style={inputStyle} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <label key={day} style={chipStyle(form.weekDays.includes(day))}>
                        <input
                          type="checkbox"
                          checked={form.weekDays.includes(day)}
                          onChange={() => {
                            const next = form.weekDays.includes(day)
                              ? form.weekDays.filter((item) => item !== day)
                              : [...form.weekDays, day].sort();
                            updateForm({ weekDays: next });
                          }}
                        />
                        {['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'][day - 1]}
                      </label>
                    ))}
                  </div>
                </section>

                <section style={fieldsetStyle}>
                  <h4 style={miniTitleStyle}>Audience</h4>
                  <div style={twoColStyle(mobile)}>
                    <label style={labelStyle}>
                      Til
                      <select value={form.targetFilter.language} onChange={(e) => updateTarget({ language: e.target.value })} style={inputStyle}>
                        <option value="">Hamma</option>
                        <option value="uz">UZ</option>
                        <option value="ru">RU</option>
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Faollik
                      <select value={form.targetFilter.activity} onChange={(e) => updateTarget({ activity: e.target.value })} style={inputStyle}>
                        {activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Kontakt
                      <select value={form.targetFilter.phoneShared} onChange={(e) => updateTarget({ phoneShared: e.target.value })} style={inputStyle}>
                        {booleanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Premium
                      <select value={form.targetFilter.premium} onChange={(e) => updateTarget({ premium: e.target.value })} style={inputStyle}>
                        {booleanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Ichki logist
                      <select value={form.targetFilter.internalDispatcher} onChange={(e) => updateTarget({ internalDispatcher: e.target.value })} style={inputStyle}>
                        {booleanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
                    {userTypeOptions.map((option) => (
                      <label key={option.value} style={chipStyle(form.targetFilter.userTypes.includes(option.value))}>
                        <input
                          type="checkbox"
                          checked={form.targetFilter.userTypes.includes(option.value)}
                          onChange={() => toggleUserType(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </section>

                <section style={fieldsetStyle}>
                  <h4 style={miniTitleStyle}>Kontent</h4>
                  <div style={twoColStyle(mobile)}>
                    <label style={labelStyle}>
                      Kontent turi
                      <select value={form.contentType} onChange={(e) => updateForm({ contentType: e.target.value })} style={inputStyle}>
                        {['TEXT', 'PHOTO', 'VIDEO', 'ANIMATION', 'VOICE'].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Parse mode
                      <select value={form.parseMode} onChange={(e) => updateForm({ parseMode: e.target.value })} style={inputStyle}>
                        {['NONE', 'HTML', 'MARKDOWN'].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                  </div>
                  {form.contentType !== 'TEXT' && (
                    <div style={{ marginTop: 10 }}>
                      <AdminMediaUpload
                        type={form.contentType}
                        value={form.mediaFileId}
                        label="Broadcast media"
                        disabled={saving}
                        successMessage=""
                        onManualChange={(mediaFileId) => updateForm({ mediaFileId })}
                        onUploaded={handleMediaUploaded}
                      />
                    </div>
                  )}
                  <label style={{ ...labelStyle, marginTop: 10 }}>
                    Matn / caption
                    <textarea
                      value={form.textTemplate}
                      onChange={(e) => updateForm({ textTemplate: e.target.value })}
                      style={textareaStyle}
                      placeholder="{orders_total}, {orders_24h}, {user_name}"
                    />
                  </label>
                </section>

                <section style={fieldsetStyle}>
                  <div style={sectionHeaderStyle}>
                    <h4 style={miniTitleStyle}>Tugmalar</h4>
                    <button type="button" onClick={addButton} style={secondaryBtnStyle}>Button qo‘shish</button>
                  </div>
                  {(form.buttons || []).length === 0 ? (
                    <div style={{ color: '#64748b' }}>Tugma yo'q.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {form.buttons.map((button, index) => (
                        <div
                          key={`${index}-${button.text}`}
                          style={{
                            ...buttonRowStyle,
                            gridTemplateColumns: mobile ? '1fr' : buttonRowStyle.gridTemplateColumns,
                          }}
                        >
                          <input type="number" min="0" value={button.row} onChange={(e) => updateButton(index, { row: e.target.value })} style={{ ...inputStyle, width: 70 }} />
                          <select value={button.type} onChange={(e) => updateButton(index, { type: e.target.value })} style={{ ...inputStyle, width: 130 }}>
                            {['CALLBACK', 'URL', 'WEB_APP'].map((value) => <option key={value} value={value}>{value}</option>)}
                          </select>
                          <input value={button.text} onChange={(e) => updateButton(index, { text: e.target.value })} style={inputStyle} placeholder="Button matni" />
                          <input value={button.payload} onChange={(e) => updateButton(index, { payload: e.target.value })} style={inputStyle} placeholder="Payload yoki URL" />
                          <button type="button" onClick={() => removeButton(index)} style={dangerTinyBtnStyle}>O'chirish</button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                  <button type="submit" style={primaryBtnStyle} disabled={saving}>
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                  <button type="button" onClick={sendTest} style={secondaryBtnStyle}>
                    Testni o'zimga yuborish
                  </button>
                  <button type="button" onClick={duplicatePlan} style={secondaryBtnStyle}>
                    Nusxalash
                  </button>
                  <button type="button" onClick={deletePlan} style={dangerBtnStyle}>
                    O'chirish
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      )}
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
  gridTemplateColumns: 'minmax(270px, 0.75fr) minmax(420px, 1.25fr)',
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

const planButtonStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 12,
  display: 'grid',
  gap: 3,
  textAlign: 'left',
  cursor: 'pointer',
};

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 10,
  flexWrap: 'wrap',
};

const fieldsetStyle = {
  border: '1px solid #edf0f5',
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
};

const miniTitleStyle = {
  margin: 0,
};

const twoColStyle = (mobile) => ({
  display: 'grid',
  gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
  gap: 10,
});

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  color: '#334155',
  fontSize: 13,
};

const switchLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  color: '#334155',
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #d8dee9',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 150,
  resize: 'vertical',
  fontFamily: 'inherit',
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

const dangerTinyBtnStyle = {
  ...dangerBtnStyle,
  padding: '8px 10px',
};

const chipStyle = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  border: `1px solid ${active ? '#9cc9ff' : '#e5e7eb'}`,
  background: active ? '#e8f2ff' : '#fff',
  borderRadius: 999,
  padding: '6px 9px',
  fontSize: 12,
  cursor: 'pointer',
});

const buttonRowStyle = {
  display: 'grid',
  gridTemplateColumns: '70px 130px minmax(140px, 1fr) minmax(160px, 1.2fr) auto',
  gap: 8,
  alignItems: 'center',
};

const warningStyle = {
  border: '1px solid #fecaca',
  background: '#fff5f5',
  color: '#991b1b',
  padding: 10,
  borderRadius: 8,
  marginTop: 12,
  fontSize: 13,
};
