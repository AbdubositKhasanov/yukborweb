import { getTelegramSupportUrl } from '../config/config';

export const PREMIUM_UPGRADE_EVENT = 'premium-upgrade-required';

export const FEATURE_LABELS = {
  createHarbinger: 'Xabarchi yaratish',
  viewCargoPhone: 'Yuk telefon raqamini ko\'rish',
  viewTransportPhone: 'Transport telefon raqamini ko\'rish',
  createOrder: 'Yuk e\'loni yaratish',
  createTransport: 'Transport e\'loni yaratish',
  offerToDriver: 'Haydovchiga taklif yuborish',
};

export const inferPremiumFeature = (message = '') => {
  const text = String(message).toLowerCase();
  if (text.includes('xabarch') || text.includes('harbinger')) return 'createHarbinger';
  if (text.includes('telefon') || text.includes('phone')) return 'viewCargoPhone';
  if (text.includes('taklif') || text.includes('haydovchi')) return 'offerToDriver';
  return 'createHarbinger';
};

export const isPremiumUpgradeError = (message = '') => {
  const text = String(message).toLowerCase();
  return (
    text.includes('premium') ||
    text.includes('tarif') ||
    text.includes('limit') ||
    text.includes('xabarch') ||
    text.includes('harbinger')
  );
};

export const openPremiumUpgrade = (payload = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PREMIUM_UPGRADE_EVENT, { detail: payload }));
};

export const getTariffsPath = (featureKey = 'createHarbinger') => {
  const mobile = typeof window !== 'undefined' && window.location.pathname.startsWith('/mobile');
  const base = mobile ? '/mobile/tariffs' : '/tariffs';
  return `${base}?feature=${encodeURIComponent(featureKey)}`;
};

export const goToTariffs = (featureKey = 'createHarbinger') => {
  if (typeof window === 'undefined') return;
  window.location.href = getTariffsPath(featureKey);
};

export const buildPurchaseMessage = ({ tariff, featureKey, reason } = {}) => {
  const feature = FEATURE_LABELS[featureKey] || 'Premium funksiya';
  const tariffText = tariff ? `"${tariff.name}" tarifini` : 'premium tarifni';
  return [
    `Salom. Men YukBor platformasida ${tariffText} sotib olmoqchiman.`,
    `Kerakli funksiya: ${feature}.`,
    reason ? `Sabab: ${reason}` : null,
  ].filter(Boolean).join('\n');
};

export const openSupportForPurchase = async ({ tariff, featureKey, reason } = {}) => {
  const text = buildPurchaseMessage({ tariff, featureKey, reason });
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // Clipboard optional: opening support is still enough.
  }
  window.open(getTelegramSupportUrl(), '_blank');
};
