import React, { useEffect, useMemo, useState } from 'react';
import { getPublicTariffs } from '../services/api';
import {
  FEATURE_LABELS,
  goToTariffs,
  openSupportForPurchase,
} from '../utils/premiumUpgrade';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function featureSummary(tariff, featureKey) {
  const feature = tariff?.features?.[featureKey];
  if (!feature?.enabled) return null;
  if (featureKey === 'createHarbinger') {
    if (feature.limit === null || feature.limit === undefined) return 'Xabarchi: cheksiz';
    return `Xabarchi: ${feature.limit} ta`;
  }
  return FEATURE_LABELS[featureKey] || 'Premium funksiya';
}

export default function ClubMembershipModal({
  isOpen,
  onClose,
  featureKey = 'createHarbinger',
  title,
  message,
  currentLimit,
}) {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    getPublicTariffs()
      .then((response) => {
        if (!cancelled && response.code === 200) {
          setTariffs(response.result || []);
        }
      })
      .catch(() => {
        if (!cancelled) setTariffs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const matchingTariffs = useMemo(() => {
    const active = tariffs.filter((tariff) => tariff.isActive !== false);
    const matched = active.filter((tariff) => tariff.features?.[featureKey]?.enabled === true);
    return matched.length > 0 ? matched : active;
  }, [tariffs, featureKey]);

  if (!isOpen) return null;

  const featureLabel = FEATURE_LABELS[featureKey] || 'Premium funksiya';
  const reason = message || `${featureLabel} uchun premium tarif kerak.`;

  const handleBuy = async (tariff) => {
    await openSupportForPurchase({ tariff, featureKey, reason });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 620 }}
      >
        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ color: 'var(--brand-accent, #1976d2)', fontWeight: 800, fontSize: 13 }}>
                Premium kerak
              </div>
              <h3 className="card-title" style={{ margin: '4px 0 8px' }}>
                {title || featureLabel}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              style={{
                border: '1px solid #e5e7eb',
                background: '#fff',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              x
            </button>
          </div>

          <p style={{ margin: '0 0 14px', color: '#555', lineHeight: 1.55 }}>
            {reason}
          </p>

          {currentLimit && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                marginBottom: 14,
                color: '#7c2d12',
                fontSize: 14,
              }}
            >
              Hozirgi limit: {currentLimit.unlimited
                ? `${currentLimit.used || 0}/cheksiz`
                : `${currentLimit.used || 0}/${currentLimit.limit || 0}`}
              {currentLimit.expiresAt && (
                <span> · tugash sanasi: {new Date(currentLimit.expiresAt).toLocaleDateString('uz-UZ')}</span>
              )}
            </div>
          )}

          <div style={{ fontWeight: 800, marginBottom: 10 }}>Mos tariflar</div>
          {loading ? (
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              Tariflar yuklanmoqda...
            </div>
          ) : matchingTariffs.length === 0 ? (
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#555' }}>
              Hozircha tariflar ko'rinmayapti. Supportga yozsangiz, admin sizga mos tarifni ulab beradi.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              {matchingTariffs.slice(0, 3).map((tariff) => (
                <div
                  key={tariff.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{tariff.name}</div>
                      {tariff.description && (
                        <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
                          {tariff.description}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900 }}>{formatMoney(tariff.priceUzs)} {tariff.currency || 'UZS'}</div>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        {tariff.durationDays ? `${tariff.durationDays} kun` : 'muddatsiz'}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: '#1f3f6d', fontSize: 13 }}>
                    {featureSummary(tariff, featureKey) || 'Premium funksiyalar ochiladi'}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleBuy(tariff)}
                    style={{ width: '100%' }}
                  >
                    Sotib olish uchun yozish
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="btn-group" style={{ marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => goToTariffs(featureKey)}
            >
              Barcha tariflarni ko'rish
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleBuy(null)}
            >
              Supportga yozish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
