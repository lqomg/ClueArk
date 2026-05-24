import { http } from './http';
import type { MeResponse } from '@/pages/app/me/types';

export async function getMe(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>('/users/me');
  return data;
}

export async function saveProfile(body: { username: string; timeZone: string }): Promise<MeResponse> {
  const { data } = await http.put<MeResponse>('/users/me/profile', body);
  return data;
}

export async function changePassword(body: { oldPassword: string; newPassword: string }): Promise<void> {
  await http.post('/users/me/password', body);
}
