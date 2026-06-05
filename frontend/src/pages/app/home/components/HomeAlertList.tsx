import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { NotificationItem } from '@/types/models';
import { relTimeIso } from '@/lib/datetime';
import { importanceScore } from '../utils';

export function HomeAlertList({ alerts, loading }: { alerts: NotificationItem[]; loading: boolean }) {
  const { t } = useTranslation();
  const top = alerts.slice(0, 6);

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-ark-surface/25 lg:w-72 xl:w-80">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-400/90" strokeWidth={2} aria-hidden />
          <h2 className="text-sm font-semibold text-white">{t('home.alerts')}</h2>
          <span className="text-[10px] text-slate-600">{t('home.alertsUrgent')}</span>
        </div>
        <Link to="/app/notifications" className="shrink-0 text-[11px] font-medium text-slate-400 transition hover:text-ark-accent hover:underline">
          {t('common.all')}
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
        {loading ? (
          <p className="py-8 text-center text-xs text-slate-500">{t('common.loading')}</p>
        ) : top.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">{t('home.noAlerts')}</p>
        ) : (
          <ol className="space-y-1">
            {top.map((n, idx) => {
              const score = importanceScore(n.score);
              const rank = String(idx + 1).padStart(2, '0');
              return (
                <li key={n.id}>
                  <Link
                    to="/app/notifications"
                    className="flex gap-3 rounded-lg border border-transparent px-2 py-2.5 transition hover:border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <span className="w-6 shrink-0 pt-0.5 text-center font-mono text-sm font-semibold tabular-nums text-slate-500">
                      {rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 inline-flex max-w-full items-center gap-1.5">
                        <span className="truncate rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400">
                          {n.monitorTitle}
                        </span>
                        {score != null ? (
                          <span className="shrink-0 font-mono text-[10px] font-medium text-slate-500">
                            {score}
                          </span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-[13px] font-medium leading-snug text-slate-200">
                        {n.title}
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-600">{relTimeIso(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
