import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMonitor, patchMonitorSources } from '@/api/monitors';
import { listSources } from '@/api/sources';
import type { Monitor, Source } from '@/types/models';
import { Button } from '@/components/ui';
import { SourceAvatar } from '@/components/sources/SourceAvatar';

async function loadAllEnabledSources(): Promise<Source[]> {
  const out: Source[] = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    const res = await listSources(`?${q.toString()}`);
    out.push(...res.items);
    if (out.length >= res.total || res.items.length === 0) break;
    page += 1;
  }
  return out;
}

export function MonitorSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minCosine, setMinCosine] = useState(0.52);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [m, srcList] = await Promise.all([getMonitor(id), loadAllEnabledSources()]);
      setMonitor(m);
      setSources(srcList);
      setSelected(new Set(m.sourceIds));
      setMinCosine(typeof m.minCosine === 'number' && Number.isFinite(m.minCosine) ? m.minCosine : 0.52);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setMonitor(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback((sourceId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  const orderedIds = useMemo(() => {
    const order = new Map(sources.map((s, i) => [s.id, i]));
    const ids = [...selected];
    ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    return ids;
  }, [selected, sources]);

  async function save() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchMonitorSources(id, { sourceIds: orderedIds, minCosine });
      setMonitor(updated);
      navigate(`/app/monitors/${id}`, { replace: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-slate-500">无效的监控 ID</p>;
  }

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Link to="/app/monitors" className="hover:text-ark-accent">
            监控
          </Link>
          <span aria-hidden>/</span>
          <Link to={`/app/monitors/${id}`} className="hover:text-ark-accent">
            {monitor?.title ?? '详情'}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-slate-600">信源</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">配置信源</h1>
        <p className="mt-2 text-xs text-slate-500">
          可修改绑定信源与语义相关度阈值；信源须全部为当前已启用。保存后时间线按新条件过滤。
        </p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">加载中…</p>
      ) : (
        <>
          <div className="rounded-xl border border-ark-border bg-ark-surface/40 p-4">
            <div className="text-sm font-medium text-slate-200">最低语义相关度</div>
            <p className="mt-1 text-[11px] text-slate-500">
              仅展示与监控话题描述相似度 ≥ 该值的动态。调高更精准、条数更少；调低更宽松。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={minCosine}
                onChange={(e) => setMinCosine(Number(e.target.value))}
                className="h-2 min-w-[200px] flex-1 cursor-pointer accent-ark-accent"
                aria-label="最低相似度"
              />
              <span className="tabular-nums text-sm font-semibold text-ark-accent">
                {minCosine.toFixed(2)}
              </span>
            </div>
          </div>
          <ul className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto rounded-xl border border-ark-border bg-ark-surface/40 p-3">
            {sources.map((s) => {
              const on = selected.has(s.id);
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(s.id)}
                      className="size-4 shrink-0 rounded border-ark-border text-ark-accent focus:ring-ark-accent/40"
                    />
                    <SourceAvatar kind={s.kind} name={s.displayName} avatarUrl={s.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{s.displayName}</div>
                      {s.note ? <div className="truncate text-[11px] text-slate-600">{s.note}</div> : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" size="md" disabled={saving} onClick={() => void save()}>
              {saving ? '保存中…' : '保存'}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => navigate(`/app/monitors/${id}`)}>
              取消
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
