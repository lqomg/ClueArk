import { http } from './http';
import type {
  FeedItem,
  Monitor,
  MonitorClusterFeedItem,
  MonitorIntelligence,
  MonitorWithListMetrics,
} from '@/types/models';

export interface MonitorFeedListResponse {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  recentHours: number;
  monitorId: string;
  minCosine: number;
}

/** `query` 须含前导 `?`，如 `?recentHours=720`；返回每条含内嵌 metrics 与 snapshotStatus */
export async function listMonitors(query = ''): Promise<MonitorWithListMetrics[]> {
  const q = query || '?recentHours=720';
  const { data } = await http.get<MonitorWithListMetrics[]>(`/monitors${q.startsWith('?') ? q : `?${q}`}`);
  return data;
}

export async function createMonitor(body: { topic: string }): Promise<Monitor> {
  const { data } = await http.post<Monitor>('/monitors', body);
  return data;
}

/** `query` 可选，如 `?recentHours=720` */
export async function getMonitorIntelligence(monitorId: string, query = ''): Promise<MonitorIntelligence> {
  const { data } = await http.get<MonitorIntelligence>(
    `/monitors/${encodeURIComponent(monitorId)}/intelligence${query}`,
  );
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

export async function listMonitorClusterItems(
  monitorId: string,
  clusterId: string,
): Promise<{ clusterId: string; items: MonitorClusterFeedItem[] }> {
  const { data } = await http.get<{ clusterId: string; items: MonitorClusterFeedItem[] }>(
    `/monitors/${encodeURIComponent(monitorId)}/clusters/${encodeURIComponent(clusterId)}/items`,
  );
  return data;
}

export async function patchMonitorSources(
  monitorId: string,
  body: { sourceIds: string[]; minCosine?: number },
): Promise<Monitor> {
  const { data } = await http.patch<Monitor>(`/monitors/${encodeURIComponent(monitorId)}/sources`, body);
  return data;
}

export async function deleteMonitor(monitorId: string): Promise<void> {
  await http.delete(`/monitors/${encodeURIComponent(monitorId)}`);
}
