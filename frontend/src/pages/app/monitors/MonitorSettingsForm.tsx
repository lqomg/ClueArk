import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonitor, patchMonitorSources } from '@/api/monitors';
import { listSources } from '@/api/sources';
import type { Monitor, Source } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
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

export type MonitorSettingsFormProps = {
  monitorId: string;
};

export function MonitorSettingsForm({ monitorId }: MonitorSettingsFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minCosine, setMinCosine] = useState(0.43);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, srcList] = await Promise.all([getMonitor(monitorId), loadAllEnabledSources()]);
      setMonitor(m);
      setSources(srcList);
      setSelected(new Set(m.sourceIds));
      setMinCosine(typeof m.minCosine === 'number' && Number.isFinite(m.minCosine) ? m.minCosine : 0.43);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadFailed'));
      setMonitor(null);
    } finally {
      setLoading(false);
    }
  }, [monitorId, t]);

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
    setSaving(true);
    setError(null);
    try {
      const updated = await patchMonitorSources(monitorId, { sourceIds: orderedIds, minCosine });
      setMonitor(updated);
      navigate(`/app/monitors?monitor=${encodeURIComponent(monitorId)}`, { replace: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate(`/app/monitors/${monitorId}/timeline`);
  }

  useAppTopBar(
    () => (
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-slate-500">
          <Link to="/app/monitors/manage" className="shrink-0 hover:text-ark-accent">
            {t('monitors.manage')}
          </Link>
          <span aria-hidden>/</span>
          <Link
            to={`/app/monitors/${monitorId}/timeline`}
            className="min-w-0 max-w-[10rem] truncate hover:text-ark-accent sm:max-w-[14rem]"
          >
            {monitor?.title ?? t('monitors.timeline')}
          </Link>
          <span aria-hidden>/</span>
          <span className="shrink-0 text-slate-600">{t('monitors.settings')}</span>
        </div>
        <h1 className="mt-0.5 truncate text-sm font-black tracking-tight text-white md:text-base">
          {t('monitors.settings')}
        </h1>
      </div>
    ),
    [monitorId, monitor?.title, t],
  );

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-6">
      <p className="text-xs text-slate-500">{t('monitors.settingsDesc')}</p>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : (
        <>
          <div className="rounded-xl border border-ark-border bg-ark-surface/40 p-4">
            <div className="text-sm font-medium text-slate-200">{t('monitors.minSimilarity')}</div>
            <p className="mt-1 text-[11px] text-slate-500">{t('monitors.minSimilarityHint')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.01}
                value={minCosine}
                onChange={(e) => setMinCosine(Number(e.target.value))}
                className="h-2 min-w-[200px] flex-1 cursor-pointer accent-ark-accent"
                aria-label={t('monitors.minSimilarityAria')}
              />
              <span className="tabular-nums text-sm font-semibold text-ark-accent">{minCosine.toFixed(2)}</span>
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
              {saving ? t('profile.saving') : t('common.save')}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
