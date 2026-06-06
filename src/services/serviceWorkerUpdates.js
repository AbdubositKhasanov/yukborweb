import { registerSW } from 'virtual:pwa-register';

const CHECK_DEBOUNCE_MS = 30 * 1000;
const PERIODIC_CHECK_MS = 10 * 60 * 1000;
const RELOAD_GUARD_KEY = 'yukbor:sw-reload-at';
const RELOAD_GUARD_MS = 10 * 1000;

const canUseServiceWorker = () => import.meta.env.PROD && 'serviceWorker' in navigator;

const readReloadGuard = () => {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  } catch {
    return 0;
  }
};

const writeReloadGuard = () => {
  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage can be unavailable in restricted WebViews.
  }
};

const reloadOnceForFreshAssets = (reason) => {
  const now = Date.now();
  if (now - readReloadGuard() < RELOAD_GUARD_MS) return;

  writeReloadGuard();
  console.info(`Reloading to load fresh app assets: ${reason}`);
  window.location.reload();
};

const isStaleChunkError = (value) => {
  const message = String(value?.message || value || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror')
  );
};

export function setupServiceWorkerUpdates() {
  if (!canUseServiceWorker()) return;

  let registration = null;
  let lastCheckAt = 0;
  let checkPromise = null;
  let updateServiceWorker = null;
  let hadController = Boolean(navigator.serviceWorker.controller);

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

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    reloadOnceForFreshAssets('service worker controller changed');
  });

  window.addEventListener('error', (event) => {
    if (isStaleChunkError(event.error || event.message)) {
      reloadOnceForFreshAssets('stale dynamic chunk');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleChunkError(event.reason)) {
      reloadOnceForFreshAssets('stale dynamic chunk');
    }
  });

  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, swRegistration) {
      registration = swRegistration || null;
      checkForUpdate({ force: true });
      window.setInterval(() => checkForUpdate(), PERIODIC_CHECK_MS);
    },
    onNeedRefresh() {
      updateServiceWorker?.(true);
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
