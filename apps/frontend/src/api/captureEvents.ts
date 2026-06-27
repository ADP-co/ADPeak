export const CAPTURE_CHANGED_EVENT = 'adpeak:capture-changed';

export function notifyCaptureChanged() {
  window.dispatchEvent(new Event(CAPTURE_CHANGED_EVENT));
}
