const OVERLAY_STATE_KEY = '__cargoverMobileOverlay';

let nextOverlayId = 1;
const overlayStack = [];
const subscribers = new Set();

const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber(overlayStack.length));
};

const getHistoryOverlayId = (state = window.history.state) => {
  return state?.[OVERLAY_STATE_KEY] || null;
};

const closeEntry = (entry) => {
  const index = overlayStack.findIndex((candidate) => candidate.id === entry.id);
  if (index === -1) return;

  overlayStack.splice(index, 1);
  notifySubscribers();
  entry.onClose();
};

const handlePopState = (event) => {
  const activeHistoryId = getHistoryOverlayId(event.state);

  // A normal back action removes the synthetic history entry belonging to the
  // top overlay. Close overlays until the stack matches the restored entry.
  while (overlayStack.length > 0) {
    const topEntry = overlayStack[overlayStack.length - 1];
    if (topEntry.id === activeHistoryId) break;
    closeEntry(topEntry);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', handlePopState);
}

export const registerMobileOverlay = (onClose) => {
  if (typeof window === 'undefined') return () => {};

  const entry = {
    id: `overlay-${nextOverlayId++}`,
    onClose,
  };

  overlayStack.push(entry);
  window.history.pushState(
    { ...window.history.state, [OVERLAY_STATE_KEY]: entry.id },
    '',
    window.location.href
  );
  notifySubscribers();

  return () => {
    const index = overlayStack.findIndex((candidate) => candidate.id === entry.id);
    if (index === -1) return;

    overlayStack.splice(index, 1);
    notifySubscribers();

    if (getHistoryOverlayId() === entry.id) {
      window.history.back();
    }
  };
};

export const closeTopMobileOverlay = () => {
  if (typeof window === 'undefined' || overlayStack.length === 0) return false;

  const topEntry = overlayStack[overlayStack.length - 1];
  if (getHistoryOverlayId() === topEntry.id) {
    window.history.back();
  } else {
    closeEntry(topEntry);
  }
  return true;
};

export const hasOpenMobileOverlay = () => overlayStack.length > 0;

export const subscribeToMobileOverlays = (subscriber) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};
