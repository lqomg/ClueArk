/** 展示用用户名与头像缩写（侧栏、个人中心等共用） */
export interface UserDisplayFields {
  email: string;
  username?: string | null;
}

export function userDisplayName(user: UserDisplayFields): string {
  const name = user.username?.trim();
  if (name) return name;
  return user.email.split('@')[0] || '用户';
}

export function userInitials(user: UserDisplayFields): string {
  const name = user.username?.trim();
  if (name && name.length >= 2) {
    return name.slice(0, 2).toUpperCase();
  }
  const local = user.email.split('@')[0] ?? '';
  return (local.slice(0, 2) || 'U').toUpperCase();
}
