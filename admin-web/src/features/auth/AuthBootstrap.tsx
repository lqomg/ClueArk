import { useEffect } from 'react';
import { adminMe } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/authStore';

/** 启动时用 /admin/auth/me 校验 persisted session */
export function AuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setAuthReady(true);
      return () => {
        alive = false;
      };
    }
    adminMe()
      .then((user) => {
        if (!alive) return;
        setSession(token, user);
        setAuthReady(true);
      })
      .catch(() => {
        if (!alive) return;
        clear();
        setAuthReady(true);
      });
    return () => {
      alive = false;
    };
  }, [token, setSession, clear, setAuthReady]);

  return null;
}
