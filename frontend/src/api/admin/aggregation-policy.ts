import { http } from '../http';
import type { AggregationPolicyDto } from '@/pages/admin/aggregation-policy/types';

export async function getAggregationPolicy(): Promise<AggregationPolicyDto> {
  const { data } = await http.get<AggregationPolicyDto>('/admin/aggregation-policy');
  return data;
}

export async function patchAggregationPolicy(
  body: Omit<AggregationPolicyDto, 'persisted'>,
): Promise<AggregationPolicyDto> {
  const { data } = await http.patch<AggregationPolicyDto>('/admin/aggregation-policy', body);
  return data;
}
