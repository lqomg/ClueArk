import type { FeedItem } from '@/types/models';

export interface ListResponse {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  mode?: 'all' | 'featured';
  clusterGrouped?: boolean;
  recentHours?: number;
}

export interface ClusterRow {
  id: string;
  sourceDisplayName: string;
  title: string;
  link: string;
  publishedAt: string | null;
}

export interface ClusterDetailResponse {
  clusterId: string;
  items: ClusterRow[];
}
