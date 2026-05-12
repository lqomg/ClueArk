import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pin, Plus, Radar, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { deleteMonitor, listMonitors } from '@/api/monitors';
import { MONITOR_PIN_LIMIT, resolvePinnedMonitors } from '@/lib/monitor-pins';
import type { Monitor } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { TopBarCountPill } from '@/components/layout/TopBarCountPill';
import { Button, Checkbox, Drawer } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useMonitorPinsStore } from '@/stores/monitorPinsStore';

const linkOutlineSm =
  'inline-flex items-center justify-center rounded-lg border border-ark-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-ark-accent/50 hover:text-ark-accent';

const manageMonitorBtnClass =
  'inline-flex shrink-0 items-center gap-2 rounded-lg border border-ark-border bg-ark-surface px-3 py-1.5 text-xs font-medium text-ark-text shadow-sm transition-colors hover:bg-white/[0.04]';

export function MonitorsListPage() {
  const navigate = useNavigate();
  const customized = useMonitorPinsStore((s) => s.customized);
  const customIds = useMonitorPinsStore((s) => s.ids);
  const setCustomPins = useMonitorPinsStore((s) => s.setCustomPins);
  const resetToDefault = useMonitorPinsStore((s) => s.resetToDefault);

  const [rows, setRows] = useState<Monitor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pinDrawerOpen, setPinDrawerOpen] = useState(false);
  const [tempIds, setTempIds] = useState<Set<string>>(() => new Set());
  const [pinError, setPinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listMonitors();
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pinDrawerOpen || !rows) return;
    const eff = resolvePinnedMonitors(rows, customized, customIds);
    setTempIds(new Set(eff.map((m) => m.id)));
    setPinError(null);
  }, [pinDrawerOpen, rows, customized, customIds]);

  const sortedForDrawer = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [rows]);

  const togglePin = useCallback((id: string) => {
    setTempIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPinError(null);
        return next;
      }
      if (next.size >= MONITOR_PIN_LIMIT) {
        setPinError(`最多选择 ${MONITOR_PIN_LIMIT} 个监控`);
        return prev;
      }
      setPinError(null);
      next.add(id);
      return next;
    });
  }, []);

  function savePins() {
    if (!rows) return;
    const selected = [...tempIds];
    const ordered = [...rows]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((m) => selected.includes(m.id))
      .map((m) => m.id)
      .slice(0, MONITOR_PIN_LIMIT);
    setCustomPins(ordered);
    setPinDrawerOpen(false);
  }

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`确定删除监控「${title}」？`)) return;
    setDeletingId(id);
    try {
      await deleteMonitor(id);
      setRows((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  const isEmpty = !loading && rows && rows.length === 0;

  const monitorOverviewHelp =
    '用一句话描述话题，系统会推荐信源并基于语义展示相关动态。时间线仅含已绑定信源、且与描述向量相似度达阈值的条目。';

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="flex min-w-0 shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-ark-text">
            <Sparkles className="size-5 shrink-0 text-indigo-400" strokeWidth={2} aria-hidden />
            <span className="truncate">监控总览</span>
          </h1>
          <div className="flex min-h-5 items-center border-l border-ark-border pl-4">
            <TopBarCountPill value={rows?.length ?? '—'} suffix="个" />
          </div>
          <div className="hidden min-h-5 max-w-md min-w-0 flex-1 border-l border-ark-border pl-4 text-sm leading-snug text-slate-500 md:block lg:max-w-xl">
            <p className="line-clamp-2">{monitorOverviewHelp}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link to="/app/monitors" className={manageMonitorBtnClass} title="监控列表与管理">
            <Settings2 size={14} strokeWidth={2} />
            管理监控
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-1.5"
            disabled={!rows?.length}
            onClick={() => setPinDrawerOpen(true)}
          >
            <Pin size={14} strokeWidth={2} />
            侧栏快捷
          </Button>
          <Link
            to="/app/monitors/new"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ark-accent px-3 py-2 text-xs font-bold text-black shadow-lg shadow-ark-accent/15 hover:opacity-95 md:gap-2 md:px-4 md:text-sm"
          >
            <Plus size={16} />
            新建监控
          </Link>
        </div>
      </div>
    ),
    [rows?.length],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      <Drawer
        open={pinDrawerOpen}
        onClose={() => setPinDrawerOpen(false)}
        title="侧栏关注"
        description={`最多 ${MONITOR_PIN_LIMIT} 个；未自选时侧栏默认展示创建时间最新的监控。保存后即固定为你选择的条目与顺序（按创建时间新→旧）。`}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetToDefault();
                setPinDrawerOpen(false);
              }}
            >
              恢复默认
            </Button>
            <Button type="button" variant="primary" onClick={() => savePins()}>
              保存自选
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          {customized
            ? '当前策略：自选（可在侧栏「关注」中一键进入）。'
            : '当前策略：默认（侧栏展示最新创建的监控，随新建而变化）。'}
        </p>
        {pinError ? <p className="mb-3 text-sm text-amber-400/95">{pinError}</p> : null}
        <ul className="space-y-1">
          {sortedForDrawer.map((m) => {
            const on = tempIds.has(m.id);
            return (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/[0.04]">
                  <Checkbox checked={on} onChange={() => togglePin(m.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{m.title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-600">
                      {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Drawer>

      {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !rows ? (
          <div className="p-8 text-center text-sm text-slate-500">加载中…</div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-500">
            <Radar className="size-10 opacity-40" strokeWidth={1.25} />
            <p className="text-sm">暂无监控，点击「新建监控」开始。</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(rows ?? []).map((m) => (
              <li
                key={m.id}
                className={cn(
                  'group flex flex-col rounded-xl border border-ark-border bg-ark-surface/50 p-4 transition',
                  'cursor-pointer hover:border-ark-accent/35 hover:bg-ark-surface/70 hover:shadow-lg hover:shadow-black/25',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ark-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ark-bg',
                )}
                tabIndex={0}
                role="link"
                aria-label={`进入监控「${m.title}」时间线`}
                onClick={() => navigate(`/app/monitors/${m.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/app/monitors/${m.id}`);
                  }
                }}
              >
                <div className="text-base font-bold text-white transition group-hover:text-ark-accent">
                  {m.title}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.description}</p>
                <p className="mt-2 text-[11px] text-slate-600">
                  {m.sourceIds.length} 个信源 ·{' '}
                  {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  <Link
                    to={`/app/monitors/${m.id}`}
                    className={linkOutlineSm}
                    onClick={(e) => e.stopPropagation()}
                  >
                    时间线
                  </Link>
                  <Link
                    to={`/app/monitors/${m.id}/settings`}
                    className={cn(linkOutlineSm, 'inline-flex items-center gap-1')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings2 size={14} />
                    信源
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:border-red-500/40 hover:text-red-300"
                    disabled={deletingId === m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDelete(m.id, m.title);
                    }}
                  >
                    <Trash2 size={14} className="mr-1 inline" />
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
