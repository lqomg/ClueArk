import { http } from './http';
import type { FeedItem, Monitor } from '@/types/models';

export interface MonitorFeedListResponse {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  recentHours: number;
  monitorId: string;
  minSimilarity: number;
}

/** `query` 须含前导 `?`，如 `?page=1&pageSize=30&recentHours=720` */
export async function listMonitors(): Promise<Monitor[]> {
  const { data } = await http.get<Monitor[]>('/monitors');
  return data;
}

export async function createMonitor(body: { description: string }): Promise<Monitor> {
  const { data } = await http.post<Monitor>('/monitors', body);
  return data;
}

export async function getMonitor(id: string): Promise<Monitor> {
  const { data } = await http.get<Monitor>(`/monitors/${encodeURIComponent(id)}`);
  return data;
}

export async function listMonitorFeed(monitorId: string, query: string): Promise<MonitorFeedListResponse> {
  const { data } = await http.get<MonitorFeedListResponse>(
    `/monitors/${encodeURIComponent(monitorId)}/feed-items${query}`,
  );
  return data;
}

export async function patchMonitorSources(monitorId: string, sourceIds: string[]): Promise<Monitor> {
  const { data } = await http.patch<Monitor>(`/monitors/${encodeURIComponent(monitorId)}/sources`, {
    sourceIds,
  });
  return data;
}

export async function deleteMonitor(monitorId: string): Promise<void> {
  await http.delete(`/monitors/${encodeURIComponent(monitorId)}`);
}
