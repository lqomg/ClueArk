import type { Source } from '@/types/models';

export interface ListResponse {
  items: Source[];
  total: number;
  page: number;
  pageSize: number;
}
