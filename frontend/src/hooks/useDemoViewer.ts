import { USER_ROLE } from '@/constants/user-role';
import { useAuthStore } from '@/stores/authStore';

/** 演示账号：后台信源/策略等只读 */
export function useDemoViewer(): boolean {
  return useAuthStore((s) => s.user?.role === USER_ROLE.Demo);
}
