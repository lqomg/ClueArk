import { http, toUser } from '@/shared/api/http';
import type { AdminUser, LoginResponse } from '@/shared/types';

export async function adminLogin(account: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/admin/auth/login', { account, password });
  return { access_token: data.access_token, user: toUser(data.user as unknown as Record<string, unknown>) };
}

export async function adminMe(): Promise<AdminUser> {
  const { data } = await http.get<Record<string, unknown>>('/admin/auth/me');
  return toUser(data);
}
