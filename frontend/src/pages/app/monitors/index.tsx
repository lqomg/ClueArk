import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Radar, Settings2, Trash2 } from 'lucide-react';
import { deleteMonitor, listMonitors } from '@/api/monitors';
import type { Monitor } from '@/types/models';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const linkOutlineSm =
  'inline-flex items-center justify-center rounded-lg border border-ark-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-ark-accent/50 hover:text-ark-accent';

export function MonitorsListPage() {
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 border-b border-ark-border bg-ark-bg pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight text-white sm:text-3xl md:text-4xl">
              监控
            </h1>
            <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-500 sm:text-xs">
              用一句话描述话题，系统会推荐信源并基于语义展示相关动态。时间线仅含已绑定信源、且与描述向量相似度达阈值的条目。
            </p>
          </div>
          <Link
            to="/app/monitors/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-ark-accent px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-ark-accent/15 hover:opacity-95 sm:self-auto"
          >
            <Plus size={16} />
            新建监控
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

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
                className="flex flex-col rounded-xl border border-ark-border bg-ark-surface/50 p-4 transition hover:border-white/10"
              >
                <Link
                  to={`/app/monitors/${m.id}`}
                  className="text-base font-bold text-white hover:text-ark-accent"
                >
                  {m.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.description}</p>
                <p className="mt-2 text-[11px] text-slate-600">
                  {m.sourceIds.length} 个信源 ·{' '}
                  {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  <Link to={`/app/monitors/${m.id}`} className={linkOutlineSm}>
                    时间线
                  </Link>
                  <Link
                    to={`/app/monitors/${m.id}/settings`}
                    className={cn(linkOutlineSm, 'inline-flex items-center gap-1')}
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
                    onClick={() => void onDelete(m.id, m.title)}
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
