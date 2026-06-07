import { config } from '../config/config';

const normalizeUrl = (value) => String(value || '').trim();

export const CONTACT_FALLBACK_MESSAGE =
  "Telegramga o'tib bo'lmadi. Bu e'lon egasining Telegram sozlamalari yoki private guruh cheklovi sabab bo'lishi mumkin. Ma'lumot shu yerda ko'rsatildi, telefon yoki e'londagi boshqa kontakt orqali bog'laning.";

export const isYukborBotDeepLink = (url) => {
  const text = normalizeUrl(url).toLowerCase();
  if (!text) return false;

  const bot = String(config.telegramBotUsername || 'yukbor_global_bot')
    .replace(/^@/, '')
    .toLowerCase();

  return (
    text.startsWith(`https://t.me/${bot}?start=`) ||
    text.startsWith(`http://t.me/${bot}?start=`) ||
    text.startsWith(`tg://resolve?domain=${bot}&start=`)
  );
};

export const getTelegramProfileLink = (telegramUsername) => {
  const username = normalizeUrl(telegramUsername).replace(/^@/, '');
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) return null;
  if (username.toLowerCase() === String(config.telegramBotUsername || '').replace(/^@/, '').toLowerCase()) return null;
  return `https://t.me/${username}`;
};

export const canOpenTelegramMessageLink = (url) => {
  const text = normalizeUrl(url);
  if (!text || isYukborBotDeepLink(text)) return false;
  return /^https?:\/\/(t\.me|telegram\.me)\//i.test(text);
};
