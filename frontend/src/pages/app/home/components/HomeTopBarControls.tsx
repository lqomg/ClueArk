import { Home, Search } from 'lucide-react';
import type { MonitorWithListMetrics } from '@/types/models';
import { Select } from '@/components/ui';

export function HomeTopBarControls({
  searchQuery,
  onSearchQueryChange,
  monitorFilter,
  onMonitorFilterChange,
  monitors,
}: {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  monitorFilter: string | null;
  onMonitorFilterChange: (id: string | null) => void;
  monitors: MonitorWithListMetrics[];
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3 md:gap-4">
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Home className="size-5 text-slate-400" strokeWidth={2} aria-hidden />
        <span className="text-sm font-semibold text-slate-300">首页</span>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="搜索决策信号、行业趋势、AI 提取片段…"
          className="h-10 w-full rounded-full border border-white/[0.08] bg-ark-surface/60 py-2 pl-11 pr-4 text-sm text-ark-text shadow-inner shadow-black/20 placeholder:text-slate-600 outline-none transition focus:border-ark-accent/35 focus:ring-1 focus:ring-ark-accent/15"
        />
      </div>

      <Select
        value={monitorFilter ?? ''}
        onChange={(e) => onMonitorFilterChange(e.target.value || null)}
        className="hidden h-10 w-44 shrink-0 border-white/[0.08] bg-ark-surface/60 md:block"
        aria-label="按话题筛选"
      >
        <option value="">全部监控话题</option>
        {monitors.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </Select>
    </div>
  );
}
