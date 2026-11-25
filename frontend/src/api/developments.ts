import { http } from './http';
import type {
  DevelopmentEvidenceItem,
  MonitorDevelopment,
  PaginatedDevelopments,
} from '@/types/models';

export interface ListMonitorDevelopmentsQuery {
  page?: number;
  pageSize?: number;
  recentHours?: number;
  sort?: 'timeline' | 'updated';
}

function buildQuery(params: ListMonitorDevelopmentsQuery): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) p.set(key, String(value));
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
