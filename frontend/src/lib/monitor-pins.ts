import type { Monitor } from '@/types/models';

/** 最多展示在侧栏快捷入口的监控数量 */
export const MONITOR_PIN_LIMIT = 3;

/**
 * 计算侧栏应展示的监控：未自选时取创建时间最新的若干条；自选时按保存顺序过滤仍存在的话题。
 */
export function resolvePinnedMonitors(
  monitors: Monitor[],
  customized: boolean,
  customIds: string[],
): Monitor[] {
  if (monitors.length === 0) return [];
  if (!customized) {
    return [...monitors]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MONITOR_PIN_LIMIT);
  }
  const map = new Map(monitors.map((m) => [m.id, m]));
  const out: Monitor[] = [];
  for (const id of customIds) {
    const m = map.get(id);
    if (m) out.push(m);
  }
  return out;
}
