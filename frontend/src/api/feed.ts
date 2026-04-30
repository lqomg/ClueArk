import { http } from './http';
import type { ClusterDetailResponse, ListResponse } from '@/pages/app/feed/types';

/** `query` 须含前导 `?`，如 `?page=1&pageSize=30` */
export async function listFeedItems(query: string): Promise<ListResponse> {
  const { data } = await http.get<ListResponse>(`/feed-items${query}`);
  return data;
}

export async function getFeedItemsByClusterId(clusterId: string): Promise<ClusterDetailResponse> {
  const { data } = await http.get<ClusterDetailResponse>(
    `/feed-items/by-cluster/${encodeURIComponent(clusterId)}`,
  );
  return data;
}
