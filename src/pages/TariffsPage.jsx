import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicTariffs, getUserMe } from '../services/api';
import {
  FEATURE_LABELS,
  openSupportForPurchase,
} from '../utils/premiumUpgrade';
import { showError } from '../utils/toast';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function featureText(tariff, featureKey) {
  const feature = tariff.features?.[featureKey];
  if (!feature?.enabled) return null;
  if (featureKey === 'createHarbinger') {
    if (feature.limit === null || feature.limit === undefined) return 'Cheksiz xabarchi';
    return `${feature.limit} ta xabarchi`;
  }
  return FEATURE_LABELS[featureKey] || 'Premium funksiya';
}

function allFeatures(tariff) {
  return Object.entries(tariff.features || {})
    .filter(([, value]) => value?.enabled)
    .map(([key, value]) => {
      if (key === 'createHarbinger') {
        return value.limit === null || value.limit === undefined
          ? 'Xabarchi: cheksiz'
          : `Xabarchi: ${value.limit} ta`;
      }
      return FEATURE_LABELS[key] || key;
    });
}

export default function TariffsPage({ mobile = false }) {
  const [searchParams] = useSearchParams();
  const featureKey = searchParams.get('feature') || 'createHarbinger';
  const [tariffs, setTariffs] = useState([]);
  const [featureLimits, setFeatureLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tariffsRes, meRes] = await Promise.allSettled([
          getPublicTariffs(),
          localStorage.getItem('authToken') ? getUserMe() : Promise.resolve(null),
        ]);

        if (tariffsRes.status === 'fulfilled' && tariffsRes.value.code === 200) {
          setTariffs(tariffsRes.value.result || []);
        }
        if (meRes.status === 'fulfilled' && meRes.value?.code === 200) {
          setFeatureLimits(meRes.value.result?.featureLimits || null);
        }
      } catch (e) {
        showError(e.response?.data?.message || e.message || 'Tariflar yuklanmadi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedTariffs = useMemo(() => {
    return [...tariffs].sort((a, b) => {
      const aMatched = a.features?.[featureKey]?.enabled ? 0 : 1;
      const bMatched = b.features?.[featureKey]?.enabled ? 0 : 1;
      return aMatched - bMatched || (a.sortOrder || 0) - (b.sortOrder || 0) || (a.priceUzs || 0) - (b.priceUzs || 0);
    });
  }, [tariffs, featureKey]);

  const limit = featureLimits?.[featureKey];
  const reason = limit?.enabled === false
    ? `${FEATURE_LABELS[featureKey] || 'Bu funksiya'} uchun tarif kerak.`
    : 'Tarifni tanlang va support orqali ulatib oling.';

  return (
    <div style={{ ...pageStyle, paddingBottom: mobile ? 90 : 32 }}>
      <section style={heroStyle}>
        <div>
          <div style={kickerStyle}>Premium tariflar</div>
          <h1 style={{ margin: '4px 0 8px', fontSize: mobile ? 24 : 32 }}>
            {FEATURE_LABELS[featureKey] || 'Premium imkoniyatlar'}
          </h1>
          <p style={{ margin: 0, color: '#536172', lineHeight: 1.55 }}>
            Limit tugaganda ish to'xtab qolmasin. O'zingizga mos tarifni tanlang, sotib olish uchun supportga yozing.
          </p>
        </div>
        {limit && (
          <div style={limitBoxStyle}>
            <div style={{ color: '#64748b', fontSize: 13 }}>Hozirgi holat</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>
              {limit.unlimited
                ? `${limit.used || 0}/cheksiz`
                : `${limit.used || 0}/${limit.limit || 0}`}
            </div>
            {limit.expiresAt && (
              <div style={{ color: '#64748b', fontSize: 12 }}>
                Tugaydi: {new Date(limit.expiresAt).toLocaleDateString('uz-UZ')}
              </div>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <div style={cardStyle}>Tariflar yuklanmoqda...</div>
      ) : sortedTariffs.length === 0 ? (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Tariflar hozircha ko'rinmayapti</h3>
          <p style={{ color: '#555' }}>Supportga yozing, admin sizga mos tarifni ulab beradi.</p>
          <button className="btn btn-primary" onClick={() => openSupportForPurchase({ featureKey, reason })}>
            Supportga yozish
          </button>
        </div>
      ) : (
        <div style={{ ...gridStyle, gridTemplateColumns: mobile ? '1fr' : gridStyle.gridTemplateColumns }}>
          {sortedTariffs.map((tariff) => {
            const matchedText = featureText(tariff, featureKey);
            const features = allFeatures(tariff);
            return (
              <article key={tariff.id} style={{ ...cardStyle, borderColor: matchedText ? '#b7d4ff' : '#e5e7eb' }}>
                {matchedText && <div style={recommendedStyle}>Mos tarif</div>}
                <h3 style={{ margin: '6px 0 4px' }}>{tariff.name}</h3>
                {tariff.description && (
                  <p style={{ color: '#64748b', margin: '0 0 12px', minHeight: 38 }}>{tariff.description}</p>
                )}
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 28, fontWeight: 900 }}>{formatMoney(tariff.priceUzs)}</span>
                  <span style={{ color: '#64748b', marginLeft: 6 }}>{tariff.currency || 'UZS'}</span>
                </div>
                <div style={{ color: '#64748b', marginBottom: 12 }}>
                  {tariff.durationDays ? `${tariff.durationDays} kun amal qiladi` : 'Muddatsiz amal qiladi'}
                </div>
                <div style={{ display: 'grid', gap: 7, marginBottom: 16 }}>
                  {(features.length ? features : ['Premium funksiyalar']).map((item) => (
                    <div key={item} style={{ color: '#263445', fontSize: 14 }}>
                      ✓ {item}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => openSupportForPurchase({ tariff, featureKey, reason })}
                  style={{ width: '100%' }}
                >
                  Sotib olish uchun yozish
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: 24,
};

const heroStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 18,
};

const kickerStyle = {
  color: '#1976d2',
  fontWeight: 900,
  fontSize: 13,
  textTransform: 'uppercase',
};

const limitBoxStyle = {
  minWidth: 180,
  background: '#fff',
  border: '1px solid #dbeafe',
  borderRadius: 8,
  padding: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 14,
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const recommendedStyle = {
  display: 'inline-flex',
  borderRadius: 999,
  background: '#e8f2ff',
  color: '#155ca8',
  padding: '4px 9px',
  fontSize: 12,
  fontWeight: 900,
};
