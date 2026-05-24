import type { UserRole } from '@/shared/constants';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  timeZone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMonitorOwner {
  id: string;
  email: string;
  username: string;
}

export interface AdminMonitorListItem {
  id: string;
  title: string;
  topicPrompt: string;
  userId: string;
  owner: AdminMonitorOwner;
  sourceCount: number;
  snapshotStatus: string;
  snapshotComputedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMonitorDetail extends AdminMonitorListItem {
  description: string;
  keywords: string[];
  entities: string[];
  sourceIds: string[];
  minCosine: number;
}

export interface AdminMonitorListResponse {
  items: AdminMonitorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AggregationPolicy {
  lookbackDays: number;
  maxPairHours: number;
  simTitle: number;
}

export interface AdminSource {
  id: string;
  kind: string;
  displayName: string;
  avatarUrl?: string | null;
  enabled: boolean;
  isOfficial?: boolean;
  sortOrder?: number;
  note?: string;
  web?: Record<string, unknown>;
  rss?: Record<string, unknown>;
  hot?: Record<string, unknown>;
  pollIntervalSec?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminJobRow {
  id: string;
  type: string;
  status: string;
  queue?: string;
  trigger?: string;
  dedupeKey?: string | null;
  parentJobId?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  sourceKind?: string | null;
  monitorId?: string | null;
  monitorTitle?: string | null;
  feedItemId?: string | null;
  priority?: number;
  attempts?: number;
  maxAttempts?: number;
  resultSummary?: Record<string, unknown> | string | null;
  errorMessage?: string | null;
  workerKind?: string | null;
  scheduledAt?: string | null;
  queuedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminJobDetail extends AdminJobRow {
  payload?: unknown;
  bullJobId?: string | null;
}

export interface AdminJobListResponse {
  items: AdminJobRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminJobStatsResponse {
  windowHours: number;
  since: string;
  buckets: Array<{ _id: { type: string; status: string }; count: number }>;
}

export interface LoginResponse {
  access_token: string;
  user: AdminUser;
}
