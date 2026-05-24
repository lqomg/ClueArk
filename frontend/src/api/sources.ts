import { http } from './http';
import type { Source } from '@/types/models';
import type { ListResponse } from '@/pages/app/sources/types';

export async function listSources(query: string): Promise<ListResponse> {
  const { data } = await http.get<ListResponse>(`/sources${query}`);
  return data;
}
