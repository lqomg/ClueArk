import type { LucideIcon } from 'lucide-react';
import { Activity, Shield, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export function TrendSpark({ counts, className }: { counts: number[]; className?: string }) {
  const w = 88;
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
      const y = h - 3 - (c / max) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      className={cn(
        'shrink-0 text-ark-accent/70 drop-shadow-[0_0_6px_rgba(0,242,255,0.28)]',
        className,
      )}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity={0.95}
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  footer,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  delta?: string | null;
  footer?: React.ReactNode;
}) {
  const deltaPositive = delta?.startsWith('+');
  const deltaNegative = delta?.startsWith('-');

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-ark-accent/[0.04] via-ark-surface/30 to-ark-content/85 px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <Icon
          className="size-5 shrink-0 text-ark-accent/50 drop-shadow-[0_0_6px_rgba(0,242,255,0.15)]"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-0.5">
        <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-white">
          {value}
        </span>
        {delta ? (
          <span
            className={cn(
              'mb-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
              deltaPositive && 'bg-ark-green-tint text-ark-green-text',
              deltaNegative && 'bg-red-950/50 text-red-400',
              !deltaPositive && !deltaNegative && 'bg-white/5 text-slate-400',
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
      {footer ? <div className="mt-2 flex justify-end">{footer}</div> : null}
    </div>
  );
}

export function HomeMetricCards({
  monitorCount,
  todayIntel,
  trendDeltaPct,
  trendSpark,
  snapshotReadyRate,
}: {
  monitorCount: number;
  todayIntel: number;
  trendDeltaPct: number | null;
  trendSpark: number[];
  snapshotReadyRate: number | null;
}) {
  const { t } = useTranslation();
  const deltaLabel =
    trendDeltaPct == null
      ? null
      : `${trendDeltaPct >= 0 ? '+' : ''}${trendDeltaPct.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <MetricCard
        label={t('home.metricTopics')}
        value={monitorCount}
        hint={t('home.metricTopicsHint')}
        icon={Target}
      />
      <MetricCard
        label={t('home.metricTodayCount')}
        value={todayIntel}
        hint={t('home.metricTodayHint')}
        icon={Activity}
        delta={deltaLabel}
        footer={<TrendSpark counts={trendSpark} />}
      />
      <MetricCard
        label={t('home.metricReadyRate')}
        value={snapshotReadyRate != null ? `${snapshotReadyRate}%` : '—'}
        hint={t('home.metricReadyHint')}
        icon={Shield}
      />
    </div>
  );
}
