export const CAPTURE_CHANGED_EVENT = 'adpeak:capture-changed';
export const CAPTURE_CHANGED_CHANNEL = 'adpeak:capture-sync';
export const CAPTURE_CHANGED_STORAGE_KEY = 'adpeak.capture.changed';

export function notifyCaptureChanged() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(CAPTURE_CHANGED_EVENT));

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CAPTURE_CHANGED_CHANNEL);
    channel.postMessage({ changedAt: Date.now() });
    channel.close();
  }

  try {
    window.localStorage.setItem(
      CAPTURE_CHANGED_STORAGE_KEY,
      `${Date.now()}:${Math.random().toString(36).slice(2)}`,
    );
  } catch {
    // The same-tab event and polling still keep the UI synchronized.
  }
}

export function subscribeCaptureChanged(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CAPTURE_CHANGED_STORAGE_KEY) listener();
  };
  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(CAPTURE_CHANGED_CHANNEL)
    : null;

  window.addEventListener(CAPTURE_CHANGED_EVENT, listener);
  window.addEventListener('storage', handleStorage);
  channel?.addEventListener('message', listener);

  return () => {
    window.removeEventListener(CAPTURE_CHANGED_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
    channel?.removeEventListener('message', listener);
    channel?.close();
  };
}
