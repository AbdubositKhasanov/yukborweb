/**
 * Telegram Mini App BackButton integration with React Router.
 *
 * Telegram Mini App da telefon "back" tugmasi bosilganda
 * app yopilish o'rniga React Router orqali navigatsiya qiladi.
 *
 * - Bosh sahifada: BackButton yashiriladi (back bosish app ni yopadi — to'g'ri)
 * - Ichki sahifalarda: BackButton ko'rsatiladi, bosilganda navigate(-1)
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Bosh sahifalar — bu sahifalarda back button ko'rsatilmaydi
const ROOT_PATHS = ['/mobile', '/mobile/', '/mobile/yuklar', '/mobile/status', '/mobile/orders'];

export default function useTelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return; // Telegram Mini App ichida emas — oddiy brauzerdamiz

    const backButton = tg.BackButton;
    if (!backButton) return;

    const isRootPage = ROOT_PATHS.includes(location.pathname);

    if (isRootPage) {
      // Bosh sahifada back tugmasini yashirish
      backButton.hide();
    } else {
      // Ichki sahifada back tugmasini ko'rsatish
      backButton.show();

      const handleBack = () => {
        navigate(-1);
      };

      backButton.onClick(handleBack);

      return () => {
        backButton.offClick(handleBack);
      };
    }
  }, [location.pathname, navigate]);
}
