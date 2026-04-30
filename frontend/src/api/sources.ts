import { http } from './http';
import type { Source } from '@/types/models';
import type { ListResponse } from '@/pages/app/sources/types';

export async function listSources(query: string): Promise<ListResponse> {
  const { data } = await http.get<ListResponse>(`/sources${query}`);
  return data;
}

export async function getSource(id: string): Promise<Source> {
  const { data } = await http.get<Source>(`/sources/${id}`);
  return data;
}

export async function uploadSourceAvatar(file: File): Promise<{ avatarUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await http.post<{ avatarUrl: string }>('/sources/avatar', fd);
  return data;
}
