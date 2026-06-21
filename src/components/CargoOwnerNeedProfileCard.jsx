import React, { useEffect, useState } from 'react';
import LocationSelector from './LocationSelector';

const DEFAULT_FORM = {
  enabled: true,
  title: '',
  cargoCountPerDay: 1,
  scheduleType: 'daily',
  requiredTimes: '09:00',
  intervalHours: 4,
  startTime: '09:00',
  endTime: '18:00',
  reminderEnabled: false,
  reminderLeadMinutes: '',
  fromCountry: '',
  fromRegion: '',
  fromCity: '',
  toCountry: '',
  toRegion: '',
  toCity: '',
  maxWeight: '',
  vehicleTypeId: '',
  additionalPhone: '',
  description: '',
};

function normalizeProfile(profile) {
  return {
    ...DEFAULT_FORM,
    enabled: profile?.enabled !== false,
    title: profile?.title || '',
    cargoCountPerDay: profile?.cargoCountPerDay || 1,
    scheduleType: profile?.scheduleType || 'daily',
    requiredTimes: (profile?.requiredTimes || ['09:00']).join(', '),
    intervalHours: profile?.intervalHours || 4,
    startTime: profile?.startTime || '09:00',
    endTime: profile?.endTime || '18:00',
    reminderEnabled: profile?.reminderEnabled === true,
    reminderLeadMinutes: profile?.reminderLeadMinutes ?? '',
    fromCountry: profile?.fromLocation?.countryId?.toString() || '',
    fromRegion: profile?.fromLocation?.regionId?.toString() || '',
    fromCity: profile?.fromLocation?.cityId?.toString() || '',
    toCountry: profile?.toLocation?.countryId?.toString() || '',
    toRegion: profile?.toLocation?.regionId?.toString() || '',
    toCity: profile?.toLocation?.cityId?.toString() || '',
    maxWeight: profile?.maxWeight || '',
    vehicleTypeId: profile?.vehicleTypeId || '',
    additionalPhone: profile?.additionalPhone || '',
    description: profile?.description || '',
  };
}

function splitTimes(value) {
  return String(value || '')
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toInt(value, fallback = null) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value, fallback = null) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function vehicleName(staticData, vehicleTypeId) {
  return staticData?.vehicleTypes?.find((item) => String(item.id) === String(vehicleTypeId))?.name || '';
}

export function buildCargoOwnerNeedTransportState(profile, staticData, mobile = false) {
  const vehicle = profile?.vehicleType || vehicleName(staticData, profile?.vehicleTypeId);
  return {
    fromNeedProfile: true,
    needInfo: {
      title: profile?.title,
      cargoCountPerDay: profile?.cargoCountPerDay,
      scheduleType: profile?.scheduleType,
      requiredTimes: profile?.requiredTimes || [],
      intervalHours: profile?.intervalHours,
      startTime: profile?.startTime,
      endTime: profile?.endTime,
      vehicleType: vehicle,
      maxWeight: profile?.maxWeight,
    },
    filters: {
      fromCountry: profile?.fromLocation?.countryId,
      fromRegion: profile?.fromLocation?.regionId,
      fromCity: profile?.fromLocation?.cityId,
      vehicleType: vehicle || undefined,
      maxWeight: profile?.maxWeight || undefined,
    },
    source: mobile ? 'mobile-need-profile' : 'need-profile',
  };
}

export default function CargoOwnerNeedProfileCard({
  profile,
  staticData,
  saving = false,
  compact = false,
  onSave,
  onFindTransports,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    setForm(normalizeProfile(profile));
  }, [profile]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      enabled: form.enabled,
      title: form.title,
      cargoCountPerDay: Math.max(1, toInt(form.cargoCountPerDay, 1)),
      scheduleType: form.scheduleType,
      requiredTimes: splitTimes(form.requiredTimes),
      intervalHours: Math.max(1, toInt(form.intervalHours, 4)),
      startTime: form.startTime,
      endTime: form.endTime,
      reminderEnabled: form.reminderEnabled,
      reminderLeadMinutes: form.reminderLeadMinutes === '' ? null : Math.max(1, toInt(form.reminderLeadMinutes, 60)),
      fromLocation: {
        countryId: toInt(form.fromCountry),
        regionId: toInt(form.fromRegion),
        cityId: toInt(form.fromCity),
      },
      toLocation: {
        countryId: toInt(form.toCountry),
        regionId: toInt(form.toRegion),
        cityId: toInt(form.toCity),
      },
      maxWeight: toFloat(form.maxWeight),
      vehicleTypeId: toInt(form.vehicleTypeId),
      additionalPhone: form.additionalPhone,
      description: form.description,
    };
    onSave?.(payload);
  };

  const effectiveLead = profile?.effectiveReminderLeadMinutes || 60;

  return (
    <section style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0 }}>Yukchi ehtiyoji</h3>
          <p style={hintStyle}>
            Kunlik yoki interval bo&apos;yicha kerak bo&apos;ladigan mashinani oldindan belgilang.
          </p>
        </div>
        <span style={statusPillStyle(form.enabled)}>
          {form.enabled ? 'Faol' : "O'chirilgan"}
        </span>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div style={compact ? oneColumnStyle : twoColumnStyle}>
          <label style={labelStyle}>
            Profil nomi
            <input
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Masalan: Kunlik Toshkent yuklari"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Kuniga nechta yuk
            <input
              type="number"
              min="1"
              value={form.cargoCountPerDay}
              onChange={(e) => update({ cargoCountPerDay: e.target.value })}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={compact ? oneColumnStyle : twoColumnStyle}>
          <LocationSelector
            label="Qayerdan"
            countryValue={form.fromCountry}
            regionValue={form.fromRegion}
            cityValue={form.fromCity}
            onCountryChange={(value) => update({ fromCountry: value })}
            onRegionChange={(value) => update({ fromRegion: value })}
            onCityChange={(value) => update({ fromCity: value })}
            staticData={staticData}
            variant={compact ? 'mobile' : 'desktop'}
          />
          <LocationSelector
            label="Qayerga"
            countryValue={form.toCountry}
            regionValue={form.toRegion}
            cityValue={form.toCity}
            onCountryChange={(value) => update({ toCountry: value })}
            onRegionChange={(value) => update({ toRegion: value })}
            onCityChange={(value) => update({ toCity: value })}
            staticData={staticData}
            variant={compact ? 'mobile' : 'desktop'}
          />
        </div>

        <div style={compact ? oneColumnStyle : twoColumnStyle}>
          <label style={labelStyle}>
            Kerakli mashina turi
            <select
              value={form.vehicleTypeId}
              onChange={(e) => update({ vehicleTypeId: e.target.value })}
              style={inputStyle}
            >
              <option value="">Hammasi</option>
              {staticData?.vehicleTypes?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Kerakli sig&apos;im (t)
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.maxWeight}
              onChange={(e) => update({ maxWeight: e.target.value })}
              placeholder="20"
              style={inputStyle}
            />
          </label>
        </div>

        <div style={scheduleBoxStyle}>
          <label style={switchLabelStyle}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Bu ehtiyoj profilini ishlatish
          </label>
          <label style={labelStyle}>
            Vaqt rejimi
            <select
              value={form.scheduleType}
              onChange={(e) => update({ scheduleType: e.target.value })}
              style={inputStyle}
            >
              <option value="daily">Kunlik aniq vaqtlar</option>
              <option value="interval">Har qancha vaqtda</option>
            </select>
          </label>

          {form.scheduleType === 'daily' ? (
            <label style={labelStyle}>
              Kerak bo&apos;ladigan vaqtlar
              <input
                value={form.requiredTimes}
                onChange={(e) => update({ requiredTimes: e.target.value })}
                placeholder="09:00, 14:00, 18:00"
                style={inputStyle}
              />
            </label>
          ) : (
            <div style={compact ? oneColumnStyle : threeColumnStyle}>
              <label style={labelStyle}>
                Boshlanish
                <input type="time" value={form.startTime} onChange={(e) => update({ startTime: e.target.value })} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Tugash
                <input type="time" value={form.endTime} onChange={(e) => update({ endTime: e.target.value })} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Har necha soatda
                <input type="number" min="1" max="24" value={form.intervalHours} onChange={(e) => update({ intervalHours: e.target.value })} style={inputStyle} />
              </label>
            </div>
          )}

          <label style={switchLabelStyle}>
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => update({ reminderEnabled: e.target.checked })}
            />
            Vaqtdan oldin ogohlantirish
          </label>
          <label style={labelStyle}>
            Necha daqiqa oldin
            <input
              type="number"
              min="1"
              max="1440"
              value={form.reminderLeadMinutes}
              onChange={(e) => update({ reminderLeadMinutes: e.target.value })}
              placeholder={`Admin default: ${effectiveLead} daqiqa`}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Kontakt telefon
          <input
            value={form.additionalPhone}
            onChange={(e) => update({ additionalPhone: e.target.value })}
            placeholder="+998..."
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Izoh
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Masalan: doimiy fura, ref yoki tent kerak"
            style={{ ...inputStyle, minHeight: 74, resize: 'vertical' }}
          />
        </label>

        <div style={actionsStyle}>
          <button type="submit" className="btn btn-primary" style={primaryActionStyle} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Ehtiyojni saqlash'}
          </button>
          {onFindTransports && (
            <button
              type="button"
              className="btn btn-secondary"
              style={secondaryActionStyle}
              onClick={() => onFindTransports()}
            >
              Mashina topish
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 12,
};

const hintStyle = {
  margin: '4px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const oneColumnStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: 12 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 12 };
const threeColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 10 };

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: '#334155',
};

const inputStyle = {
  width: '100%',
  border: '1px solid #d8dee9',
  borderRadius: 6,
  padding: '9px 10px',
  fontSize: 14,
  boxSizing: 'border-box',
  background: '#fff',
};

const switchLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#334155',
  fontSize: 14,
};

const scheduleBoxStyle = {
  display: 'grid',
  gap: 10,
  border: '1px solid #edf0f5',
  borderRadius: 8,
  padding: 12,
  background: '#fbfdff',
};

const statusPillStyle = (active) => ({
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 800,
  color: active ? '#166534' : '#64748b',
  background: active ? '#dcfce7' : '#f1f5f9',
  whiteSpace: 'nowrap',
});

const actionsStyle = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const primaryActionStyle = {
  minWidth: 160,
};

const secondaryActionStyle = {
  minWidth: 140,
};
