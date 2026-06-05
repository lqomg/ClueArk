import { http } from './http';
import type { MeResponse } from '@/pages/app/me/types';
import type { WebSupportedLocale } from '@/lib/localeStorage';

export async function getMe(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>('/users/me');
  return data;
}

export async function saveProfile(body: {
  username: string;
  timeZone: string;
  locale: WebSupportedLocale;
}): Promise<MeResponse> {
  const { data } = await http.put<MeResponse>('/users/me/profile', body);
  return data;
}

export async function changePassword(body: {
  oldPassword: string;
  newPassword: string;
}): Promise<{ ok: true; access_token?: string }> {
  const { data } = await http.post<{ ok: true; access_token?: string }>('/users/me/password', body);
  return data;
}
