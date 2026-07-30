import { useEffect, useRef } from 'react';
import { subscribeCaptureChanged } from '../api/captureEvents';

type LiveCaptureRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useLiveCaptureRefresh(
  onRefresh: () => void,
  { enabled = true, intervalMs = 15_000 }: LiveCaptureRefreshOptions = {},
) {
  const callbackRef = useRef(onRefresh);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => callbackRef.current();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const unsubscribeCaptureChanged = subscribeCaptureChanged(refresh);
    const intervalId = window.setInterval(refresh, intervalMs);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      unsubscribeCaptureChanged();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [enabled, intervalMs]);
}
