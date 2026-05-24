import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import type { NotificationItem } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { Button } from '@/components/ui';
import { ApiError } from '@/api/http';
import { useNotificationUnread } from '@/hooks/useNotificationUnread';
import { NotificationDetailDrawer } from '@/pages/app/notifications/components/NotificationDetailDrawer';
import { NotificationListCard } from '@/pages/app/notifications/components/NotificationListCard';

export function NotificationsPage() {
  const { refresh: refreshUnread } = useNotificationUnread(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<NotificationItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotifications(1, 50);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setItems(null);
    } finally {
      setLoading(false);
      void refreshUnread();
    }
  }, [refreshUnread]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items?.filter((n) => !n.readAt).length ?? 0;

  async function onMarkAllRead() {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? now })) ?? null);
      setDetail((d) => (d && !d.readAt ? { ...d, readAt: now } : d));
      void refreshUnread();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    }
  }

  useAppTopBar(
    () => (
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bell className="size-5 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight text-ark-text">通知</h1>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-ark-accent/20 px-2 py-0.5 text-[11px] font-medium text-ark-accent">
              {unreadCount} 未读
            </span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void onMarkAllRead()}>
            全部已读
          </Button>
        ) : null}
      </div>
    ),
    [unreadCount],
  );

  function patchReadLocal(id: string) {
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: now } : n)) ?? null);
    setDetail((d) => (d?.id === id ? { ...d, readAt: now } : d));
  }

  async function onMarkRead(id: string, opts?: { silent?: boolean }) {
    setMarking(true);
    try {
      await markNotificationRead(id);
      patchReadLocal(id);
      void refreshUnread();
    } catch (e) {
      if (!opts?.silent) {
        alert(e instanceof ApiError ? e.message : '标记已读失败');
      }
    } finally {
      setMarking(false);
    }
  }

  function openDetail(n: NotificationItem) {
    setDetail(n);
    setDetailOpen(true);
    if (!n.readAt) void onMarkRead(n.id, { silent: true });
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-500">加载中…</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!items?.length ? (
          <p className="py-16 text-center text-sm text-slate-500">暂无通知</p>
        ) : (
          <ul className="m-0 list-none space-y-1.5 p-0">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationListCard item={n} onOpen={() => openDetail(n)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotificationDetailDrawer
        item={detail}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onMarkRead={(id) => void onMarkRead(id)}
        marking={marking}
      />
    </div>
  );
}
