import type { StaffRole } from '@/constants/user-role';
import { USER_ROLE } from '@/constants/user-role';

/** 可进入管理区（信源/聚合策略等）的角色 */
export function isStaffRole(role: string | undefined): role is StaffRole {
  return role === USER_ROLE.Admin || role === USER_ROLE.Demo;
}
