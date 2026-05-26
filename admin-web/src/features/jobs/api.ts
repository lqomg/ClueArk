import { http } from '@/shared/api/http';
import type { AdminJobDetail, AdminJobListResponse, AdminJobStatsResponse } from '@/shared/types';

export async function listJobs(params: Record<string, string | number | undefined>): Promise<AdminJobListResponse> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const { data } = await http.get<AdminJobListResponse>(`/admin/jobs?${q}`);
  return data;
}

export async function getJob(id: string): Promise<AdminJobDetail> {
  const { data } = await http.get<AdminJobDetail>(`/admin/jobs/${id}`);
  return data;
}

export async function getJobStats(hours = 24): Promise<AdminJobStatsResponse> {
  const { data } = await http.get<AdminJobStatsResponse>(`/admin/jobs/stats?hours=${hours}`);
  return data;
}
