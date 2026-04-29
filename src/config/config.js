export const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
  telegramBotUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'yukbor_global_bot',
  telegramSupportUsername: 'yukborsupport', // Support chat username
  brandColor: '#08142c',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  encryptionKey: import.meta.env.VITE_ENCRYPTION_KEY || 'dev-key',
};

export const getTelegramLoginUrl = () => {
  return `https://t.me/${config.telegramBotUsername}?start=login`;
};

export const getTelegramSupportUrl = () => {
  return `https://t.me/${config.telegramSupportUsername}`;
};
