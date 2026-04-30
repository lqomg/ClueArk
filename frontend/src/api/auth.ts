import { http } from './http';
import type { AuthTokenResponse } from '@/pages/auth/types';

export async function login(body: { account: string; password: string }): Promise<AuthTokenResponse> {
  const { data } = await http.post<AuthTokenResponse>('/auth/login', body);
  return data;
}

export async function register(body: {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}): Promise<AuthTokenResponse> {
  const { data } = await http.post<AuthTokenResponse>('/auth/register', body);
  return data;
}

export async function sendPasswordResetCode(body: { email: string }): Promise<{ ok: true }> {
  const { data } = await http.post<{ ok: true }>('/auth/password-reset/send-code', body);
  return data;
}

export async function confirmPasswordReset(body: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  const { data } = await http.post<{ ok: true }>('/auth/password-reset/confirm', body);
  return data;
}
