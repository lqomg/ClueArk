import { useCallback, useEffect, useState } from 'react';
import { getNotificationUnreadCount } from '@/api/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useNotificationUnread(pollMs = 60_000) {
  const token = useAuthStore((s) => s.token);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setCount(0);
      return;
    }
    try {
      const n = await getNotificationUnreadCount();
      setCount(n);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    if (!token || pollMs <= 0) return;
    const t = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(t);
  }, [refresh, token, pollMs]);

  return { count, refresh };
}
