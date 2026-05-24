import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, isAdminSession } from '@/features/auth/authStore';

export function RequireAdmin({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token || !isAdminSession(user)) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

export function GuestOnly({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (token && isAdminSession(user)) {
    const from = (location.state as { from?: string } | null)?.from || '/users';
    return <Navigate to={from} replace />;
  }
  return children;
}
