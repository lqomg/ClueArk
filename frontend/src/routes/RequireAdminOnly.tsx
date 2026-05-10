import { Navigate, useLocation } from 'react-router-dom';
import { USER_ROLE } from '@/constants/user-role';
import { useAuthStore } from '@/stores/authStore';

/** 仅真实管理员（演示账号会重定向到信源管理） */
export function RequireAdminOnly({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role !== USER_ROLE.Admin) {
    return <Navigate to="/app/admin/sources" replace />;
  }
  return children;
}
