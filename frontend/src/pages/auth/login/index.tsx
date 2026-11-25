import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { publicLoginPath } from '../utils';

/** 旧 /login 全页入口：统一到公开首页弹层 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) return;
    const from =
      (location.state as { from?: string } | null)?.from ||
      new URLSearchParams(location.search).get('from') ||
      null;
    navigate(publicLoginPath(from), { replace: true });
  }, [location.search, location.state, navigate, token]);

  if (token) {
    const to = (location.state as { from?: string } | null)?.from || '/app/home';
    return <Navigate to={to} replace />;
  }

  return null;
}
