import { http } from '@/shared/api/http';
import type { AggregationPolicy } from '@/shared/types';

export async function getPolicy(): Promise<AggregationPolicy> {
  const { data } = await http.get<AggregationPolicy>('/admin/aggregation-policy');
  return data;
}

export async function updatePolicy(body: Partial<AggregationPolicy>): Promise<AggregationPolicy> {
  const { data } = await http.patch<AggregationPolicy>('/admin/aggregation-policy', body);
  return data;
}
