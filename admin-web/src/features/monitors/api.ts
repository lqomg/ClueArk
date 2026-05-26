import { http } from '@/shared/api/http';
import type { AdminMonitorDetail, AdminMonitorListResponse } from '@/shared/types';

export async function listMonitors(params: {
  page: number;
  pageSize: number;
  search?: string;
  userId?: string;
  ownerEmail?: string;
  status?: string;
}): Promise<AdminMonitorListResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.userId?.trim()) q.set('userId', params.userId.trim());
  if (params.ownerEmail?.trim()) q.set('ownerEmail', params.ownerEmail.trim());
  if (params.status?.trim()) q.set('status', params.status.trim());
  const { data } = await http.get<AdminMonitorListResponse>(`/admin/monitors?${q}`);
  return data;
}

export async function getMonitor(id: string): Promise<AdminMonitorDetail> {
  const { data } = await http.get<AdminMonitorDetail>(`/admin/monitors/${id}`);
  return data;
}

export async function deleteMonitor(id: string): Promise<void> {
  await http.delete(`/admin/monitors/${id}`);
}
