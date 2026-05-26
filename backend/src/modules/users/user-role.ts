/** 全站用户角色：数据库、JWT、校验需与此处一致 */
export const USER_ROLE_VALUES = ['user', 'admin'] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const USER_ROLE = {
  User: 'user',
  Admin: 'admin',
} as const satisfies Record<string, UserRole>;

/** 管理员创建用户时可分配的角色 */
export const ADMIN_CREATABLE_ROLE_VALUES = ['user', 'admin'] as const;

export type AdminCreatableRole = (typeof ADMIN_CREATABLE_ROLE_VALUES)[number];
