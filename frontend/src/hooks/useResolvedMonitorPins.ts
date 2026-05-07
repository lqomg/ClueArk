import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listMonitors } from '@/api/monitors';
import { resolvePinnedMonitors } from '@/lib/monitor-pins';
import { useAuthStore } from '@/stores/authStore';
import { useMonitorPinsStore } from '@/stores/monitorPinsStore';
import type { Monitor } from '@/types/models';

/**
 * 拉取监控列表并与本地自选合并，得到侧栏快捷展示数据；路由变化时刷新列表。
 */
export function useResolvedMonitorPins() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const customized = useMonitorPinsStore((s) => s.customized);
  const customIds = useMonitorPinsStore((s) => s.ids);
  const hydrate = useMonitorPinsStore((s) => s.hydrate);

  const [monitors, setMonitors] = useState<Monitor[] | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setMonitors(null);
      return;
    }
    try {
      const list = await listMonitors();
      setMonitors(list);
    } catch {
      setMonitors([]);
    }
  }, [user?.id]);

  useEffect(() => {
    hydrate(user?.id ?? null);
  }, [user?.id, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!location.pathname.startsWith('/app/monitors')) return;
    void load();
  }, [location.pathname, load]);

  const pins = useMemo(
    () => resolvePinnedMonitors(monitors ?? [], customized, customIds),
    [monitors, customized, customIds],
  );

  return {
    pins,
    monitors,
    loading: user?.id ? monitors === null : false,
    refetch: load,
  };
}
