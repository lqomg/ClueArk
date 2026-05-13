import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Radar, Settings2, Trash2 } from 'lucide-react';
import { deleteMonitor, listMonitors } from '@/api/monitors';
import type { Monitor } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { TopBarCountPill } from '@/components/layout/TopBarCountPill';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatShortDateTime, normalizeUserTimeZone } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';

const linkOutlineSm =
  'inline-flex items-center justify-center rounded-lg border border-ark-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-ark-accent/50 hover:text-ark-accent';

export function MonitorsManagePage() {
  const navigate = useNavigate();
  const viewerTz = useAuthStore((s) => normalizeUserTimeZone(s.user?.timeZone));
  const [rows, setRows] = useState<Monitor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const help =
    '在此维护全部监控：调整信源、删除话题。新建监控请前往「监控总览」底部入口。';

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="flex min-w-0 shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-ark-text">
            <span className="truncate">监控管理</span>
          </h1>
          <div className="flex min-h-5 items-center border-l border-ark-border pl-4">
            <TopBarCountPill value={rows?.length ?? '—'} suffix="个" />
          </div>
          <div className="hidden min-h-5 max-w-md min-w-0 flex-1 border-l border-ark-border pl-4 text-sm leading-snug text-slate-500 md:block lg:max-w-xl">
            <p className="line-clamp-2">{help}</p>
          </div>
        </div>
        <Link
          to="/app/monitors"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ark-border bg-ark-surface px-3 py-1.5 text-xs font-medium text-ark-text shadow-sm transition-colors hover:bg-white/[0.04]"
        >
          <LayoutDashboard size={14} strokeWidth={2} />
          监控总览
        </Link>
      </div>
    ),
    [rows?.length],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !rows ? (
          <div className="p-8 text-center text-sm text-slate-500">加载中…</div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-500">
            <Radar className="size-10 opacity-40" strokeWidth={1.25} />
            <p className="text-sm">暂无监控。</p>
            <Link to="/app/monitors" className="text-sm text-ark-accent hover:underline">
              前往监控总览创建
            </Link>
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
                aria-label={`打开监控「${m.title}」概览`}
                onClick={() => navigate(`/app/monitors?monitor=${encodeURIComponent(m.id)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/app/monitors?monitor=${encodeURIComponent(m.id)}`);
                  }
                }}
              >
                <div className="text-base font-bold text-white transition group-hover:text-ark-accent">{m.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.description}</p>
                <p className="mt-2 text-[11px] text-slate-600">
                  {m.sourceIds.length} 个信源 ·{' '}
                  {formatShortDateTime(m.createdAt, viewerTz)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  <Link
                    to={`/app/monitors/${m.id}/timeline`}
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
