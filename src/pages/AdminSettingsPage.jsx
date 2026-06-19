import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  adminGetSettings,
  adminSendGroupAnnouncementNow,
  adminUpdateSettings,
  getUserMe,
} from '../services/api';
import AdminMediaUpload from '../components/AdminMediaUpload';
import { showError, showSuccess } from '../utils/toast';

const emptyForms = {
  identity: { botUserName: '', mainGroupUsername: '' },
  freeLimits: { freeHarbingerCreateLimit: 0, freeOrderShowLimit: 3, defaultCarShowLimit: 5 },
  groupIds: {
    adminId: '',
    backupGroupId: '',
    feedbackGroupId: '',
    orderLogGroupId: '',
    infoGroupId: '',
    mainGroupId: '',
  },
  onboarding: {
    onboardingVideoFileId: '',
    onboardingWelcomeText: '',
    onboardingSuccessText: '',
    onboardingMiniAppUrl: '',
  },
  groupAnnouncer: { enabled: true, intervalMinutes: 30, pinTimes: '10:00, 16:00' },
  automation: { orderOwnerStatusPromptEnabled: false },
};

const ALL_ACCESS_GROUP = 'ALL';

function normalizePermissionGroups(groups = []) {
  const cleaned = [...new Set(groups.filter(Boolean))];
  return cleaned.includes(ALL_ACCESS_GROUP) ? [ALL_ACCESS_GROUP] : cleaned;
}

function toNumber(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIdList(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item !== 0);
}

function splitTimes(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminSettingsPage({ mobile = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [forms, setForms] = useState(emptyForms);
  const [permissions, setPermissions] = useState([]);
  const [savingSection, setSavingSection] = useState('');

  const adminLinks = useMemo(() => {
    const base = mobile ? '/mobile/admin' : '/admin';
    return [
      { label: 'Foydalanuvchilar', path: `${base}/users` },
      { label: 'Haydovchilar', path: `${base}/drivers` },
      { label: 'Tariflar', path: `${base}/tariffs` },
      { label: 'Broadcast', path: `${base}/broadcasts` },
      { label: 'Premium yuklar', path: `${base}/premium-orders` },
      { label: 'Userbotlar', path: `${base}/userbots` },
      { label: 'Sozlamalar', path: `${base}/settings` },
    ].filter((item) => item.path);
  }, [mobile]);

  const hydrate = useCallback((data) => {
    if (!data) return;
    setSettings(data);
    setForms({
      identity: {
        botUserName: data.identity?.botUserName || '',
        mainGroupUsername: data.identity?.mainGroupUsername || '',
      },
      freeLimits: {
        freeHarbingerCreateLimit: data.freeLimits?.freeHarbingerCreateLimit ?? 0,
        freeOrderShowLimit: data.freeLimits?.freeOrderShowLimit ?? 3,
        defaultCarShowLimit: data.freeLimits?.defaultCarShowLimit ?? 5,
      },
      groupIds: {
        adminId: (data.groupIds?.adminId || []).join(', '),
        backupGroupId: data.groupIds?.backupGroupId || '',
        feedbackGroupId: data.groupIds?.feedbackGroupId || '',
        orderLogGroupId: data.groupIds?.orderLogGroupId || '',
        infoGroupId: data.groupIds?.infoGroupId || '',
        mainGroupId: data.groupIds?.mainGroupId || '',
      },
      onboarding: {
        onboardingVideoFileId: data.onboarding?.onboardingVideoFileId || '',
        onboardingWelcomeText: data.onboarding?.onboardingWelcomeText || '',
        onboardingSuccessText: data.onboarding?.onboardingSuccessText || '',
        onboardingMiniAppUrl: data.onboarding?.onboardingMiniAppUrl || '',
      },
      groupAnnouncer: {
        enabled: data.groupAnnouncer?.enabled !== false,
        intervalMinutes: data.groupAnnouncer?.intervalMinutes ?? 30,
        pinTimes: (data.groupAnnouncer?.pinTimes || []).join(', '),
      },
      automation: {
        orderOwnerStatusPromptEnabled: data.automation?.orderOwnerStatusPromptEnabled === true,
      },
    });
    setPermissions((data.permissions || []).map((permission) => ({
      ...permission,
      allowedGroups: normalizePermissionGroups(permission.allowedGroups || []),
    })));
  }, []);

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

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminGetSettings();
      if (response.code === 200) hydrate(response.result);
      else showError(response.message || 'Sozlamalar yuklanmadi');
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Sozlamalar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    if (isAdmin) loadSettings();
  }, [isAdmin, loadSettings]);

  const updateForm = (section, patch) => {
    setForms((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  };

  const savePatch = async (section, payload, successText) => {
    setSavingSection(section);
    try {
      const response = await adminUpdateSettings(payload);
      if (response.code === 200) {
        hydrate(response.result);
        showSuccess(successText);
      } else {
        showError(response.message || 'Saqlanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Saqlanmadi');
    } finally {
      setSavingSection('');
    }
  };

  const togglePermissionGroup = (featureKey, groupKey) => {
    setPermissions((prev) => prev.map((item) => {
      if (item.key !== featureKey) return item;
      const current = normalizePermissionGroups(item.allowedGroups || []);
      let next;
      if (groupKey === ALL_ACCESS_GROUP) {
        next = current.includes(ALL_ACCESS_GROUP) ? [] : [ALL_ACCESS_GROUP];
      } else {
        const withoutAll = current.filter((group) => group !== ALL_ACCESS_GROUP);
        next = withoutAll.includes(groupKey)
          ? withoutAll.filter((group) => group !== groupKey)
          : [...withoutAll, groupKey];
      }
      return { ...item, allowedGroups: next };
    }));
  };

  const saveFreeLimits = (e) => {
    e.preventDefault();
    savePatch('freeLimits', {
      freeLimits: {
        freeHarbingerCreateLimit: Math.max(0, toNumber(forms.freeLimits.freeHarbingerCreateLimit, 0)),
        freeOrderShowLimit: Math.max(1, toNumber(forms.freeLimits.freeOrderShowLimit, 1)),
        defaultCarShowLimit: Math.max(1, toNumber(forms.freeLimits.defaultCarShowLimit, 1)),
      },
    }, 'Bepul limitlar saqlandi');
  };

  const savePermissions = () => {
    const payload = {};
    permissions.forEach((item) => {
      payload[item.key] = normalizePermissionGroups(item.allowedGroups || []);
    });
    savePatch('permissions', { permissions: payload }, 'Funksiya ruxsatlari saqlandi');
  };

  const saveGroupAnnouncer = (e) => {
    e.preventDefault();
    savePatch('groupAnnouncer', {
      groupAnnouncer: {
        enabled: forms.groupAnnouncer.enabled === true,
        intervalMinutes: Math.max(1, Math.min(1440, toNumber(forms.groupAnnouncer.intervalMinutes, 30))),
        pinTimes: splitTimes(forms.groupAnnouncer.pinTimes),
      },
    }, 'Guruh xabarchi sozlamalari saqlandi');
  };

  const sendGroupAnnouncement = async (pin) => {
    setSavingSection(pin ? 'groupAnnouncerPinNow' : 'groupAnnouncerSendNow');
    try {
      const response = await adminSendGroupAnnouncementNow(pin);
      if (response.code === 200) {
        showSuccess(pin ? `Xabar yuborildi va pin qilindi: ${response.result}` : `Xabar yuborildi: ${response.result}`);
      } else {
        showError(response.message || 'Xabar yuborilmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Xabar yuborilmadi');
    } finally {
      setSavingSection('');
    }
  };

  const saveOnboarding = (e) => {
    e.preventDefault();
    savePatch('onboarding', { onboarding: forms.onboarding }, 'Onboarding sozlamalari saqlandi');
  };

  const handleOnboardingVideoUploaded = async (media) => {
    const nextOnboarding = {
      ...forms.onboarding,
      onboardingVideoFileId: media.fileId,
    };
    updateForm('onboarding', nextOnboarding);
    await savePatch('onboardingMedia', { onboarding: nextOnboarding }, 'Onboarding video yuklandi va saqlandi');
  };

  const saveIdentity = (e) => {
    e.preventDefault();
    savePatch('identity', { identity: forms.identity }, 'Bot username sozlamalari saqlandi');
  };

  const saveGroupIds = (e) => {
    e.preventDefault();
    savePatch('groupIds', {
      groupIds: {
        adminId: parseIdList(forms.groupIds.adminId),
        backupGroupId: toNumber(forms.groupIds.backupGroupId, 0),
        feedbackGroupId: toNumber(forms.groupIds.feedbackGroupId, 0),
        orderLogGroupId: toNumber(forms.groupIds.orderLogGroupId, 0),
        infoGroupId: toNumber(forms.groupIds.infoGroupId, 0),
        mainGroupId: toNumber(forms.groupIds.mainGroupId, 0),
      },
    }, 'Guruh ID sozlamalari saqlandi');
  };

  const saveAutomation = () => {
    savePatch('automation', {
      automation: {
        orderOwnerStatusPromptEnabled: forms.automation.orderOwnerStatusPromptEnabled === true,
      },
    }, 'Avtomatsiya sozlamalari saqlandi');
  };

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  return (
    <div style={{ ...pageStyle, padding: mobile ? '16px 12px 90px' : pageStyle.padding }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Admin sozlamalar</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>
            Bot admin panelidagi asosiy limit, ruxsat va avtomatsiyalarni webdan boshqaring.
          </p>
        </div>
        <button type="button" style={secondaryBtnStyle} onClick={loadSettings} disabled={loading}>
          Yangilash
        </button>
      </div>

      <div style={quickLinksStyle}>
        {adminLinks.map((link) => (
          <button
            key={link.path}
            type="button"
            onClick={() => navigate(link.path)}
            style={{
              ...quickLinkStyle,
              background: location.pathname === link.path ? '#e8f2ff' : '#fff',
              borderColor: location.pathname === link.path ? '#9cc9ff' : '#e5e7eb',
            }}
          >
            {link.label}
          </button>
        ))}
      </div>

      {loading || !settings ? (
        <div style={cardStyle}>Yuklanmoqda...</div>
      ) : (
        <div style={{ ...gridStyle, gridTemplateColumns: mobile ? '1fr' : gridStyle.gridTemplateColumns }}>
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Bepul limitlar</h3>
            <p style={hintStyle}>Tarif sotib olmagan foydalanuvchilar uchun. Xabarchi limiti 0 bo'lsa, user avtomatik tariflarga yo'naltiriladi.</p>
            <form onSubmit={saveFreeLimits} style={formGridStyle}>
              <label style={labelStyle}>
                Xabarchi yaratish
                <input
                  type="number"
                  min="0"
                  value={forms.freeLimits.freeHarbingerCreateLimit}
                  onChange={(e) => updateForm('freeLimits', { freeHarbingerCreateLimit: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Yuk ko'rish
                <input
                  type="number"
                  min="1"
                  value={forms.freeLimits.freeOrderShowLimit}
                  onChange={(e) => updateForm('freeLimits', { freeOrderShowLimit: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Mashina ko'rish
                <input
                  type="number"
                  min="1"
                  value={forms.freeLimits.defaultCarShowLimit}
                  onChange={(e) => updateForm('freeLimits', { defaultCarShowLimit: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <button type="submit" style={primaryBtnStyle} disabled={savingSection === 'freeLimits'}>
                {savingSection === 'freeLimits' ? 'Saqlanmoqda...' : 'Limitlarni saqlash'}
              </button>
            </form>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Funksiya ruxsatlari</h3>
            <p style={hintStyle}>Qaysi guruh qaysi funksiyadan foydalana olishini belgilang. Tarif bo'lsa, tarif ruxsati ham ishlaydi.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {permissions.map((permission) => {
                const allowedGroups = normalizePermissionGroups(permission.allowedGroups || []);
                const allSelected = allowedGroups.includes(ALL_ACCESS_GROUP);
                return (
                  <div key={permission.key} style={permissionRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <strong>{permission.label}</strong>
                      {permission.description && <div style={hintStyle}>{permission.description}</div>}
                    </div>
                    <div style={groupGridStyle}>
                      {(settings.accessGroups || []).map((group) => {
                        const disabled = allSelected && group.key !== ALL_ACCESS_GROUP;
                        const active = allowedGroups.includes(group.key);
                        return (
                          <label key={group.key} style={chipStyle(active, disabled)}>
                            <input
                              type="checkbox"
                              checked={active}
                              disabled={disabled}
                              onChange={() => togglePermissionGroup(permission.key, group.key)}
                            />
                            {group.label}
                          </label>
                        );
                      })}
                    </div>
                    {allSelected && (
                      <div style={permissionHintStyle}>
                        Hammasi tanlangan: alohida guruhlar avtomatik qamrab olinadi.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              style={{ ...primaryBtnStyle, marginTop: 12 }}
              onClick={savePermissions}
              disabled={savingSection === 'permissions'}
            >
              {savingSection === 'permissions' ? 'Saqlanmoqda...' : 'Ruxsatlarni saqlash'}
            </button>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Guruh xabarchi</h3>
            <p style={hintStyle}>Main group uchun avtomatik e'lon yuborish va pin qilish vaqtlarini sozlang.</p>
            <form onSubmit={saveGroupAnnouncer} style={formGridStyle}>
              <label style={switchLabelStyle}>
                <input
                  type="checkbox"
                  checked={forms.groupAnnouncer.enabled}
                  onChange={(e) => updateForm('groupAnnouncer', { enabled: e.target.checked })}
                />
                Avtomatik yuborish yoqilgan
              </label>
              <label style={labelStyle}>
                Interval (daqiqa)
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={forms.groupAnnouncer.intervalMinutes}
                  onChange={(e) => updateForm('groupAnnouncer', { intervalMinutes: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Pin vaqtlari
                <input
                  value={forms.groupAnnouncer.pinTimes}
                  onChange={(e) => updateForm('groupAnnouncer', { pinTimes: e.target.value })}
                  style={inputStyle}
                  placeholder="10:00, 16:00"
                />
              </label>
              <button type="submit" style={primaryBtnStyle} disabled={savingSection === 'groupAnnouncer'}>
                {savingSection === 'groupAnnouncer' ? 'Saqlanmoqda...' : 'Guruh xabarchini saqlash'}
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={secondaryBtnStyle}
                  onClick={() => sendGroupAnnouncement(false)}
                  disabled={savingSection === 'groupAnnouncerSendNow'}
                >
                  {savingSection === 'groupAnnouncerSendNow' ? 'Yuborilmoqda...' : 'Hozir yuborish'}
                </button>
                <button
                  type="button"
                  style={secondaryBtnStyle}
                  onClick={() => sendGroupAnnouncement(true)}
                  disabled={savingSection === 'groupAnnouncerPinNow'}
                >
                  {savingSection === 'groupAnnouncerPinNow' ? 'Yuborilmoqda...' : 'Yuborib pin qilish'}
                </button>
              </div>
            </form>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Onboarding</h3>
            <p style={hintStyle}>Botga yangi kirgan userga ko'rsatiladigan video, matn va Mini App tugmasi.</p>
            <form onSubmit={saveOnboarding} style={formGridStyle}>
              <AdminMediaUpload
                type="VIDEO"
                value={forms.onboarding.onboardingVideoFileId}
                label="Onboarding video"
                description="Video bot orqali admin chattingizga yuboriladi va file_id avtomatik saqlanadi."
                disabled={!!savingSection}
                successMessage=""
                onManualChange={(onboardingVideoFileId) => updateForm('onboarding', { onboardingVideoFileId })}
                onUploaded={handleOnboardingVideoUploaded}
              />
              <label style={labelStyle}>
                Welcome text
                <textarea
                  value={forms.onboarding.onboardingWelcomeText}
                  onChange={(e) => updateForm('onboarding', { onboardingWelcomeText: e.target.value })}
                  style={textareaStyle}
                />
              </label>
              <label style={labelStyle}>
                Success text
                <textarea
                  value={forms.onboarding.onboardingSuccessText}
                  onChange={(e) => updateForm('onboarding', { onboardingSuccessText: e.target.value })}
                  style={textareaStyle}
                />
              </label>
              <label style={labelStyle}>
                Mini App URL
                <input
                  value={forms.onboarding.onboardingMiniAppUrl}
                  onChange={(e) => updateForm('onboarding', { onboardingMiniAppUrl: e.target.value })}
                  style={inputStyle}
                  placeholder="https://t.me/..."
                />
              </label>
              <button type="submit" style={primaryBtnStyle} disabled={savingSection === 'onboarding'}>
                {savingSection === 'onboarding' ? 'Saqlanmoqda...' : 'Onboardingni saqlash'}
              </button>
            </form>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Bot username</h3>
            <form onSubmit={saveIdentity} style={formGridStyle}>
              <label style={labelStyle}>
                Bot username
                <input
                  value={forms.identity.botUserName}
                  onChange={(e) => updateForm('identity', { botUserName: e.target.value })}
                  style={inputStyle}
                  placeholder="yukbor_global_bot"
                />
              </label>
              <label style={labelStyle}>
                Main group username
                <input
                  value={forms.identity.mainGroupUsername}
                  onChange={(e) => updateForm('identity', { mainGroupUsername: e.target.value })}
                  style={inputStyle}
                  placeholder="yukbortruck"
                />
              </label>
              <button type="submit" style={primaryBtnStyle} disabled={savingSection === 'identity'}>
                {savingSection === 'identity' ? 'Saqlanmoqda...' : 'Username sozlamalarini saqlash'}
              </button>
            </form>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Guruh IDlar</h3>
            <form onSubmit={saveGroupIds} style={formGridStyle}>
              <label style={labelStyle}>
                Admin IDlar
                <input
                  value={forms.groupIds.adminId}
                  onChange={(e) => updateForm('groupIds', { adminId: e.target.value })}
                  style={inputStyle}
                  placeholder="1373227721, 7847410944"
                />
              </label>
              {['backupGroupId', 'feedbackGroupId', 'orderLogGroupId', 'infoGroupId', 'mainGroupId'].map((key) => (
                <label key={key} style={labelStyle}>
                  {key}
                  <input
                    value={forms.groupIds[key]}
                    onChange={(e) => updateForm('groupIds', { [key]: e.target.value })}
                    style={inputStyle}
                  />
                </label>
              ))}
              <button type="submit" style={primaryBtnStyle} disabled={savingSection === 'groupIds'}>
                {savingSection === 'groupIds' ? 'Saqlanmoqda...' : 'ID sozlamalarini saqlash'}
              </button>
            </form>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Avtomatsiya</h3>
            <p style={hintStyle}>Yuk egasidan yuk holatini eslatma orqali so'rash oqimi.</p>
            <label style={switchLabelStyle}>
              <input
                type="checkbox"
                checked={forms.automation.orderOwnerStatusPromptEnabled}
                onChange={(e) => updateForm('automation', { orderOwnerStatusPromptEnabled: e.target.checked })}
              />
              Order holatini har soatda so'rash
            </label>
            <button
              type="button"
              style={{ ...primaryBtnStyle, marginTop: 12 }}
              onClick={saveAutomation}
              disabled={savingSection === 'automation'}
            >
              {savingSection === 'automation' ? 'Saqlanmoqda...' : 'Avtomatsiyani saqlash'}
            </button>
          </section>
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
  marginBottom: 14,
};

const quickLinksStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 16,
};

const quickLinkStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 700,
  color: '#1f2937',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(320px, 1fr))',
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

const sectionTitleStyle = {
  margin: '0 0 6px',
};

const hintStyle = {
  margin: '0 0 10px',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const formGridStyle = {
  display: 'grid',
  gap: 10,
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 13,
  color: '#334155',
};

const switchLabelStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
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
  minHeight: 82,
  resize: 'vertical',
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

const permissionRowStyle = {
  border: '1px solid #edf0f5',
  borderRadius: 8,
  padding: 12,
  display: 'grid',
  gap: 10,
};

const groupGridStyle = {
  display: 'flex',
  gap: 7,
  flexWrap: 'wrap',
};

const chipStyle = (active, disabled = false) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  border: `1px solid ${active ? '#9cc9ff' : '#e5e7eb'}`,
  background: active ? '#e8f2ff' : disabled ? '#f5f6f8' : '#fff',
  color: disabled ? '#94a3b8' : '#334155',
  borderRadius: 999,
  padding: '6px 9px',
  fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.68 : 1,
});

const permissionHintStyle = {
  color: '#64748b',
  fontSize: 12,
  background: '#f8fafc',
  border: '1px solid #edf0f5',
  borderRadius: 8,
  padding: '8px 10px',
};
