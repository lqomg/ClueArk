import { http } from './http';
import type { FeedItem, Monitor, MonitorIntelligence, MonitorOverviewCard } from '@/types/models';

export interface MonitorFeedListResponse {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  recentHours: number;
  monitorId: string;
  minCosine: number;
}

/** `query` 须含前导 `?`，如 `?page=1&pageSize=30&recentHours=720` */
export async function listMonitors(): Promise<Monitor[]> {
  const { data } = await http.get<Monitor[]>('/monitors');
  return data;
}

/** `query` 可选，如 `?recentHours=720`；返回列表与各监控侧栏卡片指标 */
export async function listMonitorsOverview(
  query = '',
): Promise<{ monitors: Monitor[]; cards: MonitorOverviewCard[] }> {
  const { data } = await http.get<{ monitors: Monitor[]; cards: MonitorOverviewCard[] }>(
    `/monitors/overview${query}`,
  );
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
