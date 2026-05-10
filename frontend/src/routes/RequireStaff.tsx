import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { isStaffRole } from '@/utils/auth-roles';

/** 管理员或演示账号可访问（信源管理、聚合策略等） */
export function RequireStaff({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isStaffRole(role)) {
    return <Navigate to="/app/sources" replace />;
  }
  return children;
}
