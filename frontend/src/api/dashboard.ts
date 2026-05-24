import { http } from './http';
import type { FeedItem } from '@/types/models';

export interface DashboardFeedItem extends FeedItem {
  monitorId: string;
  monitorTitle: string;
}

export interface DashboardFeedResponse {
  items: DashboardFeedItem[];
  total: number;
  page: number;
  pageSize: number;
  recentHours: number;
}

export interface DashboardFeedQuery {
  page?: number;
  pageSize?: number;
  recentHours?: number;
  monitorId?: string | null;
  q?: string;
}

export async function getDashboardFeed(query: DashboardFeedQuery = {}): Promise<DashboardFeedResponse> {
  const p = new URLSearchParams();
  if (query.page != null) p.set('page', String(query.page));
  if (query.pageSize != null) p.set('pageSize', String(query.pageSize));
  if (query.recentHours != null) p.set('recentHours', String(query.recentHours));
  if (query.monitorId) p.set('monitorId', query.monitorId);
  if (query.q?.trim()) p.set('q', query.q.trim());
  const qs = p.toString();
  const { data } = await http.get<DashboardFeedResponse>(`/dashboard/feed${qs ? `?${qs}` : ''}`);
  return data;
}
