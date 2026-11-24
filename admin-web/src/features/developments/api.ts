import { http } from '@/shared/api/http';

export type AdminDevelopmentListItem = {
  id: string;
  monitorId: string;
  title: string;
  summary: string;
  type: string;
  severity: string;
  evidenceItemIds: string[];
  occurredAt: string;
  timelineAt: string;
  lastMeaningfulAt: string | null;
  locale: string;
  createdAt: string | null;
};

export type AdminDevelopmentListResponse = {
  items: AdminDevelopmentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listDevelopments(params: {
  page: number;
  pageSize: number;
  search?: string;
  monitorId?: string;
  userId?: string;
}): Promise<AdminDevelopmentListResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.monitorId?.trim()) q.set('monitorId', params.monitorId.trim());
  if (params.userId?.trim()) q.set('userId', params.userId.trim());
  const { data } = await http.get<AdminDevelopmentListResponse>(`/admin/developments?${q}`);
  return data;
}
