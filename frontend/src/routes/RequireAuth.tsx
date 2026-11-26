import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { publicLoginPath } from '@/pages/auth/utils';

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to={publicLoginPath(location.pathname)} replace />;
  }
  return children;
}
