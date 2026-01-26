/**
 * Vaqtni formatlash uchun utility
 * 10 daqiqagacha - "Hozirgina tushdi"
 * Undan keyin - daqiqa aniqligida sana va vaqt
 */
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // 10 daqiqagacha
  if (diffMinutes < 10) {
    return 'Hozirgina tushdi';
  }

  // Daqiqa aniqligida ko'rsatish
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};
