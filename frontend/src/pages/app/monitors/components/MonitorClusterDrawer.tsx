import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listMonitorClusterItems } from '@/api/monitors';
import type { MonitorClusterFeedItem } from '@/types/models';
import { Drawer } from '@/components/ui';
import { formatFeedCardHeaderRelative, normalizeUserTimeZone } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';

type Props = {
  monitorId: string;
  clusterId: string;
  open: boolean;
  onClose: () => void;
};

export function MonitorClusterDrawer({ monitorId, clusterId, open, onClose }: Props) {
  const { t } = useTranslation();
  const tz = useAuthStore((s) => normalizeUserTimeZone(s.user?.timeZone));
  const [items, setItems] = useState<MonitorClusterFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !monitorId || !clusterId) return;
    let cancelled = false;
    setItems([]);
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await listMonitorClusterItems(monitorId, clusterId);
        if (!cancelled) setItems(res.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('common.loadFailed'));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, monitorId, clusterId, t]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('monitors.clusterDrawerTitle')}
      description={t('monitors.clusterDrawerDesc')}
      panelClassName="sm:max-w-lg"
    >
      {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="text-sm text-slate-500">{t('monitors.clusterEmpty')}</p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {items.map((it) => {
          const header = formatFeedCardHeaderRelative(it.publishedAt, tz);
          return (
            <li key={it.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
              <p className="text-[11px] text-slate-500">
                {it.sourceDisplayName}
                <span className="mx-1.5 text-slate-700">·</span>
                <span className="font-mono tabular-nums text-slate-600">{header.display}</span>
              </p>
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 block text-sm font-medium leading-snug text-slate-100 underline decoration-slate-600/40 underline-offset-2 hover:text-ark-accent"
              >
                {it.title}
              </a>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
