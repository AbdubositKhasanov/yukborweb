// Application Configuration
export const config = {
  apiBaseUrl: '/api',
  telegramBotUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'yukbor_global_bot',
  brandColor: '#08142c',
};

// Telegram login redirect
export const getTelegramLoginUrl = () => {
  return `tg://resolve?domain=${config.telegramBotUsername}&start=login`;
};
