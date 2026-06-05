import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutList, Sparkles, Trash2 } from 'lucide-react';
import { deleteMonitor, listMonitors } from '@/api/monitors';
import type { MonitorWithListMetrics } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { Button } from '@/components/ui';
import { MonitorCreateProgress } from '@/components/monitors/MonitorCreateProgress';
import { MonitorTopicCreateBar } from '@/pages/app/monitors/MonitorTopicCreateBar';
import { useMonitorCreateFlow } from '@/hooks/useMonitorCreateFlow';
import { cn } from '@/lib/cn';
import { relTimeIso } from '@/lib/datetime';

function TrendSpark({ counts, className }: { counts: number[]; className?: string }) {
  const w = 76;
  const h = 22;
  const n = counts.length;
  if (n === 0) {
    return <span className={cn('inline-block shrink-0', className)} style={{ width: w, height: h }} aria-hidden />;
  }
  const max = Math.max(1, ...counts);
  const step = n <= 1 ? 0 : w / (n - 1);
  const pts = counts
    .map((c, i) => {
      const x = n <= 1 ? w / 2 : i * step;
      const y = h - 2 - (c / max) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      className={cn('shrink-0 text-ark-accent', className)}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity={0.88}
      />
    </svg>
  );
}

export function MonitorManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<MonitorWithListMetrics[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monitors = await listMonitors('?recentHours=720');
      setRows(monitors);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadFailed'));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [rows]);

  const { state: createFlow, start: startCreate, dismiss: dismissCreate } = useMonitorCreateFlow(
    useCallback(
      (monitorId: string) => {
        void loadRows();
        navigate(`/app/monitors?monitor=${encodeURIComponent(monitorId)}`, { replace: false });
      },
      [loadRows, navigate],
    ),
  );

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const topic = topicDraft.trim();
    if (!topic) {
      setError(t('monitors.topicRequired'));
      return;
    }
    setError(null);
    setTopicDraft('');
    void startCreate(topic);
  }

  async function onDelete(id: string, title: string) {
    if (!window.confirm(t('monitors.deleteConfirm', { title }))) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteMonitor(id);
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('monitors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <h1 className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-ark-text">
            <LayoutList className="size-5 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
            {t('monitors.manage')}
          </h1>
          <p className="min-w-0 text-xs leading-snug text-slate-500 md:max-w-2xl md:border-l md:border-ark-border md:pl-4 md:text-sm">
            {t('monitors.manageDesc')}
          </p>
        </div>
        <Link
          to="/app/monitors"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ark-border bg-ark-surface px-3 py-1.5 text-xs font-medium text-ark-text shadow-sm transition-colors hover:bg-white/[0.04]"
        >
          <Sparkles size={14} strokeWidth={2} aria-hidden />
          {t('monitors.intel')}
        </Link>
      </div>
    ),
    [t],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MonitorCreateProgress state={createFlow} onDismiss={dismissCreate} />
      {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-3">
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-ark-border bg-ark-surface/40 px-4 py-8 text-center text-sm text-slate-500">
            {t('monitors.emptyManage')}
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0" aria-label={t('monitors.listTitle')}>
            {sorted.map((m) => {
              const metrics = m.metrics;
              const counts = (metrics?.trend ?? []).map((p) => p.count);
              const heat = metrics?.heatIndex ?? null;
              const n24 = metrics?.newLast24h ?? 0;
              const lastAt = metrics?.lastActivityAt ?? m.updatedAt;
              const busy = deletingId === m.id;
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-ark-border bg-ark-surface/40 p-3 md:flex md:items-stretch md:justify-between md:gap-4 md:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white md:text-base">{m.title}</h2>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{t('monitors.heat')}</span>
                        <span className="text-base font-bold tabular-nums leading-none text-ark-accent">
                          {heat != null ? heat.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{m.description}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                      <span className="text-[10px] text-slate-500">{t('monitors.updatedAt', { time: relTimeIso(lastAt) })}</span>
                      <div className="flex items-center gap-2">
                        <TrendSpark counts={counts} />
                        <span className="whitespace-nowrap text-[10px] font-mono font-semibold tabular-nums text-ark-accent/90">
                          +{n24}
                          <span className="font-sans font-normal text-slate-600"> {t('monitors.hours24')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3 md:mt-0 md:w-52 md:shrink-0 md:flex-col md:border-l md:border-t-0 md:pl-4 md:pt-0">
                    <Link
                      to={`/app/monitors?monitor=${encodeURIComponent(m.id)}`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-ark-border bg-ark-bg/60 px-2.5 py-2 text-center text-[11px] font-medium text-slate-200 transition hover:border-ark-accent/40 hover:text-ark-accent md:flex-none"
                    >
                      {t('monitors.intel')}
                      <ArrowRight className="size-3 shrink-0" aria-hidden />
                    </Link>
                    <Link
                      to={`/app/monitors/${m.id}/timeline`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-ark-border bg-ark-bg/60 px-2.5 py-2 text-center text-[11px] font-medium text-slate-200 transition hover:border-ark-accent/40 hover:text-ark-accent md:flex-none"
                    >
                      {t('monitors.timeline')}
                    </Link>
                    <Link
                      to={`/app/monitors/${m.id}/settings`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-ark-border bg-ark-bg/60 px-2.5 py-2 text-center text-[11px] font-medium text-slate-200 transition hover:border-ark-accent/40 hover:text-ark-accent md:flex-none"
                    >
                      {t('monitors.settings')}
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      className="flex-1 border-red-500/30 text-red-400 hover:border-red-500/50 hover:text-red-300 md:flex-none"
                      onClick={() => void onDelete(m.id, m.title)}
                    >
                      <Trash2 size={14} className="mr-1 inline shrink-0" aria-hidden />
                      {busy ? t('common.deleting') : t('common.delete')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <MonitorTopicCreateBar
        topicDraft={topicDraft}
        setTopicDraft={setTopicDraft}
        onSubmit={onCreate}
        creating={createFlow.running}
        inputId="monitor-manage-topic"
        outerClassName="px-0 pb-2 pt-2 md:pt-3 md:pb-4"
      />
    </div>
  );
}
