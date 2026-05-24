import { Link } from 'react-router-dom';
import { LayoutList } from 'lucide-react';
import type { MonitorWithListMetrics } from '@/types/models';
import { Select } from '@/components/ui';

export function HomeWelcomeHeader({
  displayName,
  monitorFilter,
  onMonitorFilterChange,
  monitors,
}: {
  displayName: string;
  monitorFilter?: string | null;
  onMonitorFilterChange?: (id: string | null) => void;
  monitors?: MonitorWithListMetrics[];
}) {
  const showMobileFilter =
    monitors != null && monitors.length > 0 && onMonitorFilterChange != null;

  return (
    <div className="shrink-0 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
            👋 你好，{displayName}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            AI 引擎已从你的监控话题中筛选最新线索，按时间混排展示。
          </p>
        </div>
        <Link
          to="/app/monitors/manage"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/15 hover:text-white"
        >
          <LayoutList className="size-3.5" aria-hidden />
          监控管理
        </Link>
      </div>

      {showMobileFilter ? (
        <Select
          value={monitorFilter ?? ''}
          onChange={(e) => onMonitorFilterChange(e.target.value || null)}
          className="h-10 w-full border-white/[0.08] bg-ark-surface/60 md:hidden"
          aria-label="按话题筛选"
        >
          <option value="">全部监控话题</option>
          {monitors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </Select>
      ) : null}
    </div>
  );
}
