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
  if (text.includes('transport') && (text.includes('telefon') || text.includes('phone'))) return 'viewTransportPhone';
  if (text.includes('telefon') || text.includes('phone') || text.includes('cargo') || text.includes('yuk')) return 'viewCargoPhone';
  if (text.includes('taklif') || text.includes('haydovchi')) return 'offerToDriver';
  return 'createHarbinger';
};

export const isPremiumUpgradeError = (message = '') => {
  const text = String(message).toLowerCase();
  const normalized = text
    .replace(/[‘’`]/g, "'")
    .replace(/yo‘q/g, "yo'q")
    .replace(/yo’q/g, "yo'q");
  return (
    normalized.includes('premium') ||
    normalized.includes('tarif') ||
    normalized.includes('limit') ||
    normalized.includes('xabarch') ||
    normalized.includes('harbinger') ||
    normalized.includes("ruxsat yo'q") ||
    normalized.includes('ruxsat yoq') ||
    normalized.includes('permission') ||
    normalized.includes('forbidden')
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

const getPurchaseUserId = (user) => (
  user?.chatId ||
  user?.userId ||
  user?.id ||
  user?._id ||
  null
);

export const buildPurchaseMessage = ({ tariff, featureKey, reason, user } = {}) => {
  const feature = FEATURE_LABELS[featureKey] || 'Premium funksiya';
  const tariffText = tariff ? `"${tariff.name}" tarifini` : 'premium tarifni';
  const userId = getPurchaseUserId(user);
  return [
    `Salom. Men YukBor platformasida ${tariffText} sotib olmoqchiman.`,
    userId ? `User ID: ${userId}.` : null,
    `Kerakli funksiya: ${feature}.`,
    reason ? `Sabab: ${reason}` : null,
  ].filter(Boolean).join('\n');
};

export const openSupportForPurchase = async ({ tariff, featureKey, reason, user } = {}) => {
  const text = buildPurchaseMessage({ tariff, featureKey, reason, user });
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // Clipboard optional: opening support is still enough.
  }
  window.open(getTelegramSupportUrl(), '_blank');
};
