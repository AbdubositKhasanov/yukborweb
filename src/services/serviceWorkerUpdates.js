import { registerSW } from 'virtual:pwa-register';

const CHECK_DEBOUNCE_MS = 30 * 1000;
const PERIODIC_CHECK_MS = 10 * 60 * 1000;

const canUseServiceWorker = () => import.meta.env.PROD && 'serviceWorker' in navigator;

export function setupServiceWorkerUpdates() {
  if (!canUseServiceWorker()) return;

  let registration = null;
  let lastCheckAt = 0;
  let checkPromise = null;

  const checkForUpdate = async ({ force = false } = {}) => {
    if (!registration) {
      registration = await navigator.serviceWorker.getRegistration();
    }

    if (!registration) return;

    const now = Date.now();
    if (!force && now - lastCheckAt < CHECK_DEBOUNCE_MS) return;

    lastCheckAt = now;

    if (checkPromise) return checkPromise;

    checkPromise = registration
      .update()
      .catch((error) => {
        console.warn('Service worker update check failed', error);
      })
      .finally(() => {
        checkPromise = null;
      });

    return checkPromise;
  };

  registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, swRegistration) {
      registration = swRegistration || null;
      checkForUpdate({ force: true });
      window.setInterval(() => checkForUpdate(), PERIODIC_CHECK_MS);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  window.addEventListener('focus', () => checkForUpdate());
  window.addEventListener('online', () => checkForUpdate({ force: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate({ force: true });
    }
  });
}
