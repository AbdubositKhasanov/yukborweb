import React from 'react';
import { FEATURE_LABELS } from '../utils/premiumUpgrade';

const FEATURE_ORDER = [
  'createHarbinger',
  'viewCargoPhone',
  'viewTransportPhone',
  'createOrder',
  'createTransport',
  'offerToDriver',
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatTariffDate(timestamp, withTime = false) {
  if (!timestamp) return 'muddatsiz';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'muddatsiz';
  return withTime ? date.toLocaleString('uz-UZ') : date.toLocaleDateString('uz-UZ');
}

export function getTariffState(subscription) {
  if (!subscription) {
    return {
      key: 'none',
      label: 'Tarif ulanmagan',
      tone: '#64748b',
      background: '#f8fafc',
      border: '#e2e8f0',
    };
  }

  if (subscription.isActive) {
    return {
      key: 'active',
      label: 'Faol',
      tone: '#16703c',
      background: '#f0fdf4',
      border: '#bbf7d0',
    };
  }

  return {
    key: 'expired',
    label: 'Muddati tugagan',
    tone: '#b45309',
    background: '#fffbeb',
    border: '#fde68a',
  };
}

export function getTariffTimeText(subscription) {
  if (!subscription) return 'Premium imkoniyatlar ulanmagan';
  if (!subscription.expiresAt) return 'Muddatsiz amal qiladi';

  const diff = subscription.expiresAt - Date.now();
  const days = Math.ceil(diff / DAY_MS);
  if (days < 0) return `${formatTariffDate(subscription.expiresAt)} da tugagan`;
  if (days === 0) return 'Bugun tugaydi';
  if (days === 1) return '1 kun qoldi';
  return `${days} kun qoldi`;
}

export function getTariffProgress(subscription) {
  if (!subscription?.startedAt || !subscription?.expiresAt) return null;
  const total = subscription.expiresAt - subscription.startedAt;
  if (total <= 0) return null;
  const progress = ((Date.now() - subscription.startedAt) / total) * 100;
  return Math.max(0, Math.min(100, progress));
}

export function formatSubscriptionShort(subscription) {
  if (!subscription) return 'Tarifsiz';
  const name = subscription.tariffName || 'Tarif';
  if (!subscription.isActive) return `${name} tugagan`;
  if (!subscription.expiresAt) return `${name}, muddatsiz`;
  const days = Math.ceil((subscription.expiresAt - Date.now()) / DAY_MS);
  return days > 0 ? `${name}, ${days} kun` : `${name}, bugun tugaydi`;
}

function buildFeatureRows(featureLimits, tariff, maxFeatures) {
  if (featureLimits && typeof featureLimits === 'object') {
    return FEATURE_ORDER
      .map((key) => {
        const limit = featureLimits[key];
        if (!limit) return null;
        if (key === 'createHarbinger') {
          const value = limit.unlimited
            ? `${limit.used || 0}/cheksiz`
            : `${limit.used || 0}/${limit.limit ?? 0}`;
          return {
            key,
            label: FEATURE_LABELS[key] || key,
            value,
            enabled: limit.unlimited || limit.enabled,
          };
        }
        return {
          key,
          label: FEATURE_LABELS[key] || key,
          value: limit.enabled ? 'Ochiq' : 'Yopiq',
          enabled: limit.enabled,
        };
      })
      .filter(Boolean)
      .slice(0, maxFeatures);
  }

  if (tariff?.features && typeof tariff.features === 'object') {
    return FEATURE_ORDER
      .map((key) => {
        const feature = tariff.features[key];
        if (!feature?.enabled) return null;
        if (key === 'createHarbinger') {
          return {
            key,
            label: FEATURE_LABELS[key] || key,
            value: feature.limit === null || feature.limit === undefined ? 'Cheksiz' : `${feature.limit} ta`,
            enabled: true,
          };
        }
        return {
          key,
          label: FEATURE_LABELS[key] || key,
          value: 'Ochiq',
          enabled: true,
        };
      })
      .filter(Boolean)
      .slice(0, maxFeatures);
  }

  return [];
}

function actionClass(mobile, primary) {
  if (mobile) return primary ? 'm-btn m-btn-primary' : 'm-btn m-btn-secondary';
  return primary ? 'btn btn-primary' : 'btn btn-secondary';
}

export default function TariffStatusCard({
  user,
  subscription: directSubscription,
  featureLimits: directFeatureLimits,
  tariff,
  admin = false,
  mobile = false,
  compact = false,
  showFeatures = true,
  maxFeatures = 6,
  onViewTariffs,
  onManage,
  onCancel,
  style,
}) {
  const subscription = directSubscription ?? user?.subscription ?? null;
  const featureLimits = directFeatureLimits ?? user?.featureLimits ?? null;
  const state = getTariffState(subscription);
  const progress = getTariffProgress(subscription);
  const rows = showFeatures ? buildFeatureRows(featureLimits, tariff, maxFeatures) : [];
  const title = subscription?.tariffName || tariff?.name || 'Bepul holat';
  const startedText = subscription?.startedAt ? formatTariffDate(subscription.startedAt) : null;
  const expiresText = subscription?.expiresAt ? formatTariffDate(subscription.expiresAt) : 'muddatsiz';
  const canCancel = admin && subscription && onCancel;

  return (
    <section
      style={{
        ...cardStyle,
        borderColor: state.border,
        background: state.background,
        padding: compact ? 12 : 16,
        ...style,
      }}
    >
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>{admin ? 'User tarifi' : 'Mening tarifim'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            <h3 style={{ ...titleStyle, fontSize: compact ? 17 : 20 }}>{title}</h3>
            <span style={{ ...pillStyle, color: state.tone, borderColor: state.border, background: '#fff' }}>
              {state.label}
            </span>
          </div>
          <p style={subtitleStyle}>{getTariffTimeText(subscription)}</p>
        </div>

        {(onViewTariffs || onManage) && (
          <div style={actionsStyle}>
            {onManage && (
              <button type="button" className={actionClass(mobile, true)} onClick={onManage} style={buttonStyle}>
                {subscription ? 'Boshqarish' : 'Tarif berish'}
              </button>
            )}
            {onViewTariffs && (
              <button type="button" className={actionClass(mobile, !subscription)} onClick={onViewTariffs} style={buttonStyle}>
                {subscription ? "Tariflarni ko'rish" : 'Tarif tanlash'}
              </button>
            )}
            {canCancel && (
              <button type="button" className={actionClass(mobile, false)} onClick={onCancel} style={buttonStyle}>
                Bekor qilish
              </button>
            )}
          </div>
        )}
      </div>

      {progress !== null && (
        <div style={progressWrapStyle} aria-label="Tarif muddati">
          <div style={{ ...progressBarStyle, width: `${progress}%`, background: state.tone }} />
        </div>
      )}

      {!compact && subscription && (
        <div style={metaGridStyle}>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Boshlangan</span>
            <strong>{startedText || '-'}</strong>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Tugaydi</span>
            <strong>{expiresText}</strong>
          </div>
          {subscription.assignedByAdmin && (
            <div style={metaItemStyle}>
              <span style={metaLabelStyle}>Admin ID</span>
              <strong>{subscription.assignedByAdmin}</strong>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ ...featuresGridStyle, gridTemplateColumns: mobile ? '1fr' : featuresGridStyle.gridTemplateColumns }}>
          {rows.map((row) => (
            <div key={row.key} style={featureRowStyle}>
              <span style={{ ...featureDotStyle, background: row.enabled ? '#22c55e' : '#cbd5e1' }} />
              <span style={featureLabelStyle}>{row.label}</span>
              <strong style={{ color: row.enabled ? '#0f172a' : '#94a3b8' }}>{row.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const eyebrowStyle = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const titleStyle = {
  margin: 0,
  color: '#0f172a',
  fontWeight: 900,
  lineHeight: 1.2,
};

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid',
  borderRadius: 999,
  padding: '4px 9px',
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

const subtitleStyle = {
  margin: '6px 0 0',
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.45,
};

const actionsStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const buttonStyle = {
  whiteSpace: 'nowrap',
};

const progressWrapStyle = {
  height: 6,
  background: 'rgba(255,255,255,0.85)',
  borderRadius: 999,
  overflow: 'hidden',
  marginTop: 14,
};

const progressBarStyle = {
  height: '100%',
  borderRadius: 999,
  transition: 'width 0.2s ease',
};

const metaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 8,
  marginTop: 12,
};

const metaItemStyle = {
  display: 'grid',
  gap: 2,
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
};

const metaLabelStyle = {
  color: '#64748b',
  fontSize: 12,
};

const featuresGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
  gap: 8,
  marginTop: 12,
};

const featureRowStyle = {
  display: 'grid',
  gridTemplateColumns: '10px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(255,255,255,0.78)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 8,
  padding: '9px 10px',
  minWidth: 0,
};

const featureDotStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
};

const featureLabelStyle = {
  color: '#334155',
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
