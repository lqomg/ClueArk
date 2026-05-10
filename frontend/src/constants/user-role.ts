/**
 * 须与 backend/src/modules/users/user-role.ts 保持一致
 */
export const USER_ROLE_VALUES = ['user', 'admin', 'demo'] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const USER_ROLE = {
  User: 'user',
  Admin: 'admin',
  Demo: 'demo',
} as const satisfies Record<string, UserRole>;

export type StaffRole = typeof USER_ROLE.Admin | typeof USER_ROLE.Demo;

/** 管理后台列表/表单展示 */
export function userRoleLabel(role: UserRole): string {
  switch (role) {
    case USER_ROLE.Admin:
      return '管理员';
    case USER_ROLE.Demo:
      return '演示';
    default:
      return '用户';
  }
}
