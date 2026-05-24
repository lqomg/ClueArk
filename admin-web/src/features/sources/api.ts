import { http } from '@/shared/api/http';
import type { AdminSource } from '@/shared/types';

export async function listSources(includeDisabled = true): Promise<AdminSource[]> {
  const { data } = await http.get<AdminSource[]>(`/admin/sources?includeDisabled=${includeDisabled ? '1' : '0'}`);
  return data;
}

export async function getSource(id: string): Promise<AdminSource> {
  const { data } = await http.get<AdminSource>(`/admin/sources/${id}`);
  return data;
}

export async function createSource(body: Record<string, unknown>): Promise<AdminSource> {
  const { data } = await http.post<AdminSource>('/admin/sources', body);
  return data;
}

export async function updateSource(id: string, body: Record<string, unknown>): Promise<AdminSource> {
  const { data } = await http.patch<AdminSource>(`/admin/sources/${id}`, body);
  return data;
}

export async function deleteSource(id: string): Promise<void> {
  await http.delete(`/admin/sources/${id}`);
}

export async function exportSourcesJson(): Promise<unknown> {
  const { data } = await http.get<unknown>('/admin/sources/export/json');
  return data;
}

export async function importSourcesJson(body: unknown): Promise<unknown> {
  const { data } = await http.post<unknown>('/admin/sources/import/json', body);
  return data;
}

export async function uploadSourceAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<{ avatarUrl: string }>('/sources/avatar', form);
  return data;
}
