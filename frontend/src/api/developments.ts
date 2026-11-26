import { http } from './http';
import type {
  DevelopmentEvidenceItem,
  HomeFeedResponse,
  HomeFeedStreamTab,
  MonitorDevelopment,
  MorningBriefingResponse,
  PaginatedDevelopments,
} from '@/types/models';

export interface ListMonitorDevelopmentsQuery {
  page?: number;
  pageSize?: number;
  recentHours?: number;
  sort?: 'timeline' | 'updated';
}

function buildQuery(params: object): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value != null && value !== '') p.set(key, String(value));
  }
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export async function listMonitorDevelopments(
  monitorId: string,
  query: ListMonitorDevelopmentsQuery = {},
): Promise<PaginatedDevelopments> {
  const { data } = await http.get<PaginatedDevelopments>(
    `/monitors/${encodeURIComponent(monitorId)}/developments${buildQuery(query)}`,
  );
  return data;
}

export async function getMonitorDevelopment(
  monitorId: string,
  developmentId: string,
): Promise<MonitorDevelopment> {
  const { data } = await http.get<MonitorDevelopment>(
    `/monitors/${encodeURIComponent(monitorId)}/developments/${encodeURIComponent(developmentId)}`,
  );
  return data;
}

export async function listDevelopmentEvidence(
  monitorId: string,
  developmentId: string,
): Promise<{ items: DevelopmentEvidenceItem[] }> {
  const { data } = await http.get<{ items: DevelopmentEvidenceItem[] }>(
    `/monitors/${encodeURIComponent(monitorId)}/developments/${encodeURIComponent(developmentId)}/evidence`,
  );
  return data;
}

export interface HomeFeedQuery {
  recentHours?: number;
  tab?: HomeFeedStreamTab;
  limit?: number;
  cursor?: string;
}

export async function getHomeFeed(query: HomeFeedQuery = {}): Promise<HomeFeedResponse> {
  const { data } = await http.get<HomeFeedResponse>(`/users/me/home-feed${buildQuery(query)}`);
  return data;
}

export interface MorningBriefingQuery {
  recentHours?: number;
}

export async function getMorningBriefing(
  query: MorningBriefingQuery = {},
): Promise<MorningBriefingResponse> {
  const { data } = await http.get<MorningBriefingResponse>(
    `/users/me/morning-briefing${buildQuery(query)}`,
  );
  return data;
}
