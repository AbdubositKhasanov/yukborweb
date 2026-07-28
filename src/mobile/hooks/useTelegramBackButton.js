/**
 * Telegram Mini App BackButton integration with React Router.
 *
 * Telegram Mini App da telefon "back" tugmasi bosilganda
 * app yopilish o'rniga React Router orqali navigatsiya qiladi.
 *
 * - Bosh sahifada: BackButton yashiriladi (back bosish app ni yopadi — to'g'ri)
 * - Ichki sahifalarda: BackButton ko'rsatiladi, bosilganda navigate(-1)
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMobileTabs } from '../navigationConfig';
import {
  closeTopMobileOverlay,
  hasOpenMobileOverlay,
  subscribeToMobileOverlays,
} from '../utils/mobileOverlayHistory';

const STATIC_ROOT_PATHS = ['/mobile', '/mobile/'];

export default function useTelegramBackButton(userRole = 'logist', navigation = null) {
  const location = useLocation();
  const navigate = useNavigate();
  const [overlayCount, setOverlayCount] = useState(0);
  const rootPaths = useMemo(() => {
    const tabPaths = getMobileTabs(userRole, navigation).map((tab) => tab.path);
    return new Set([...STATIC_ROOT_PATHS, ...tabPaths]);
  }, [userRole, navigation]);

  useEffect(() => {
    setOverlayCount(hasOpenMobileOverlay() ? 1 : 0);
    return subscribeToMobileOverlays(setOverlayCount);
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return; // Telegram Mini App ichida emas — oddiy brauzerdamiz

    const backButton = tg.BackButton;
    if (!backButton) return;

    const isRootPage = rootPaths.has(location.pathname);

    if (isRootPage && overlayCount === 0) {
      // Bosh sahifada back tugmasini yashirish
      backButton.hide();
    } else {
      // Ichki sahifada back tugmasini ko'rsatish
      backButton.show();

      const handleBack = () => {
        if (closeTopMobileOverlay()) return;
        navigate(-1);
      };

      backButton.onClick(handleBack);

      return () => {
        backButton.offClick(handleBack);
      };
    }
  }, [location.pathname, navigate, overlayCount, rootPaths]);
}
