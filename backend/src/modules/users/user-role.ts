/** 全站用户角色：数据库、JWT、校验需与此处一致 */
export const USER_ROLE_VALUES = ['user', 'admin', 'demo'] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const USER_ROLE = {
  User: 'user',
  Admin: 'admin',
  Demo: 'demo',
} as const satisfies Record<string, UserRole>;
