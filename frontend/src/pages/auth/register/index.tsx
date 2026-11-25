import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { publicRegisterPath } from '../utils';

/** 旧 /register 全页入口：改走官网弹层 */
export function RegisterPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) return;
    navigate(publicRegisterPath(), { replace: true });
  }, [navigate, token]);

  if (token) return <Navigate to="/app/home" replace />;
  return null;
}
