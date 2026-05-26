import { http, toUser } from '@/shared/api/http';
import type { AdminUser, AdminUserListResponse } from '@/shared/types';
import type { UserRole } from '@/shared/constants';

export async function listUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<AdminUserListResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search?.trim()) q.set('search', params.search.trim());
  const { data } = await http.get<{ items: Record<string, unknown>[]; total: number; page: number; pageSize: number }>(
    `/admin/users?${q}`,
  );
  return {
    ...data,
    items: data.items.map((row) => toUser(row)),
  };
}

export async function createUser(body: {
  email: string;
  password: string;
  role: UserRole;
  username?: string;
}): Promise<AdminUser> {
  const { data } = await http.post<Record<string, unknown>>('/admin/users', body);
  return toUser(data);
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await http.patch(`/admin/users/${userId}/active`, { isActive });
}
