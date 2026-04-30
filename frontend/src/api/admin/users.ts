import { http } from '../http';
import type { AdminUserListResponse } from '@/types/admin';

export async function listAdminUsers(queryString: string): Promise<AdminUserListResponse> {
  const { data } = await http.get<AdminUserListResponse>(`/admin/users?${queryString}`);
  return data;
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<void> {
  await http.patch(`/admin/users/${userId}/active`, { isActive });
}
