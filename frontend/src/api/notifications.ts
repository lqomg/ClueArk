import { http } from './http';
import type { NotificationItem } from '@/types/models';

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listNotifications(page = 1, pageSize = 20): Promise<NotificationListResponse> {
  const { data } = await http.get<NotificationListResponse>(
    `/notifications?page=${page}&pageSize=${pageSize}`,
  );
  return data;
}

export async function getNotificationUnreadCount(): Promise<number> {
  const { data } = await http.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await http.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await http.patch<{ modified: number }>('/notifications/read-all');
  return data.modified;
}
