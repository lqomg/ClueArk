/**
 * 须与 backend/src/modules/users/user-role.ts 保持一致
 */
export const USER_ROLE_VALUES = ['user', 'admin'] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const USER_ROLE = {
  User: 'user',
  Admin: 'admin',
} as const satisfies Record<string, UserRole>;

export function userRoleLabel(role: UserRole): string {
  switch (role) {
    case USER_ROLE.Admin:
      return '管理员';
    default:
      return '用户';
  }
}
