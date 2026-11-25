import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MorningBriefingResponse } from '@/types/models';
import { cn } from '@/lib/cn';
import { relTimeIso } from '@/lib/datetime';

const COLOR_CLASS = ['text-[#b85c4b]', 'text-[#8a6a2f]', 'text-[#5a6b7c]'] as const;
const SWATCH_CLASS = ['bg-[#b85c4b]', 'bg-[#8a6a2f]', 'bg-[#5a6b7c]'] as const;

type Props = {
  data: MorningBriefingResponse | null;
  loading: boolean;
  timeZone: string;
  onCreateTopic: () => void;
  onGoFollowing: () => void;
};

export function HomeMorningBriefing({
  data,
  loading,
  timeZone,
  onCreateTopic,
  onGoFollowing,
}: Props) {
  const { t } = useTranslation();

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="h-7 w-[90%] animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="mt-8 h-14 animate-pulse rounded bg-neutral-50" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2 border-t border-neutral-100 py-4">
            <div className="h-4 w-[70%] animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-40 animate-pulse rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    );
  }

  if (data && data.readableMonitorCount === 0) {
    return (
      <div className="py-10">
        <p className="text-[1.25rem] font-semibold leading-snug tracking-tight text-neutral-800">
          {data.overview || t('home.briefingEmptyTitle')}
        </p>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-neutral-400">
          {t('home.briefingEmptyBody')}
        </p>
        <div className="mt-8 flex flex-wrap gap-4 text-[13px]">
          <button
            type="button"
            onClick={onCreateTopic}
            className="font-medium text-neutral-900 underline-offset-4 hover:underline"
          >
            {t('home.createTopic')}
          </button>
          <button
            type="button"
            onClick={onGoFollowing}
            className="font-medium text-neutral-500 underline-offset-4 hover:underline"
          >
            {t('home.tabRecommended')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, stats, pulses, topics, quietTopics, recentHours, generatedAt, windowStart } =
    data;
  const nowMs = Date.parse(generatedAt) || Date.now();
  const sinceMs = Date.parse(windowStart ?? '') || nowMs - recentHours * 3600_000;
  const windowMs = Math.max(1, nowMs - sinceMs);
  const axisTz = data.timeZone || timeZone;
  const lead = topics.length > 0 || pulses.length > 0 ? '' : overview;
  const legendTopics = topics.slice(0, 6);

  return (
    <div>
      {lead ? (
        <h1 className="mb-6 text-[clamp(1.2rem,3.2vw,1.4rem)] font-semibold leading-[1.45] tracking-[-0.015em] text-neutral-800">
          {lead}
        </h1>
      ) : null}

      <section
        className={lead ? 'border-t border-neutral-100 pt-4' : undefined}
        aria-label={t('home.briefingAxisLabel')}
      >
        <div className="mb-3.5 text-[12px] text-neutral-400">
          <strong className="text-[12px] font-medium text-neutral-500">
            {t('home.briefingAxisTitle')}
          </strong>
        </div>
        <div className="relative h-14" aria-hidden>
          <div className="absolute inset-x-0 top-[42%] h-px -translate-y-1/2 bg-neutral-300" />
          {[0, 25, 50, 75, 100].map((pct) => (
            <span
              key={pct}
              className="absolute top-[42%] h-1.5 w-px -translate-x-1/2 -translate-y-1/2 bg-neutral-300"
              style={{ left: `${pct}%` }}
            >
              <span className="absolute left-1/2 top-2.5 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-neutral-400">
                {pct === 100
                  ? t('home.briefingNow')
                  : formatAxisClock(sinceMs + (pct / 100) * windowMs, axisTz)}
              </span>
            </span>
          ))}
          {pulses.map((p) => {
            const at = Date.parse(p.timelineAt);
            const ratio =
              Number.isFinite(at) && windowMs > 0
                ? Math.min(1, Math.max(0, (at - sinceMs) / windowMs))
                : 0;
            const color = COLOR_CLASS[p.colorIndex % COLOR_CLASS.length];
            const crit = p.severity === 'critical';
            return (
              <span
                key={p.developmentId}
                className={cn(
                  'absolute top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90',
                  color,
                  crit ? 'size-2.5 shadow-[0_0_0_3px_rgba(184,92,75,0.12)]' : 'size-2',
                )}
                style={{ left: `${ratio * 100}%`, backgroundColor: 'currentColor' }}
              />
            );
          })}
        </div>
        {legendTopics.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12px] text-neutral-500">
            {legendTopics.map((topic) => (
              <span key={topic.monitorId} className="inline-flex items-center gap-1.5">
                <i
                  className={cn(
                    'inline-block size-1.5 rounded-full',
                    SWATCH_CLASS[topic.colorIndex % SWATCH_CLASS.length],
                  )}
                  aria-hidden
                />
                {topic.title}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {topics.length > 0 ? (
        <ul className="mt-7 list-none p-0">
          {topics.map((topic) => {
            const swatch = SWATCH_CLASS[topic.colorIndex % SWATCH_CLASS.length];
            return (
              <li key={topic.monitorId} className="border-t border-neutral-100 py-4 last:border-b">
                <div className="grid grid-cols-[6px_1fr_auto] gap-x-3 gap-y-0">
                  <span className={cn('mt-1.5 size-1.5 rounded-full', swatch)} aria-hidden />
                  <div className="min-w-0">
                    <Link
                      to={`/app/topics/${encodeURIComponent(topic.monitorId)}`}
                      className="block text-left"
                    >
                      <p className="text-[15px] font-medium leading-snug tracking-tight text-neutral-800 hover:underline hover:underline-offset-[0.14em]">
                        {topic.statusLine}
                      </p>
                      <p className="mt-0.5 text-[12px] font-normal text-neutral-400">{topic.title}</p>
                    </Link>
                    <ul className="mt-2.5 list-none space-y-2.5 p-0">
                      {topic.developments.map((dev) => (
                        <li key={dev.id} className="relative pl-3">
                          <span
                            className="absolute left-0 top-[0.55em] size-[3px] rounded-full bg-neutral-300"
                            aria-hidden
                          />
                          <Link
                            to={`/app/topics/${encodeURIComponent(topic.monitorId)}/developments/${encodeURIComponent(dev.id)}`}
                            className="block text-left"
                          >
                            <p className="text-[13px] font-medium leading-snug text-neutral-700 hover:underline hover:underline-offset-2">
                              {dev.title}
                            </p>
                            {dev.summary ? (
                              <p className="mt-0.5 line-clamp-2 text-[12px] font-normal leading-snug text-neutral-500">
                                {dev.summary}
                              </p>
                            ) : null}
                            <p className="mt-0.5 text-[11px] tabular-nums text-neutral-400">
                              {relTimeIso(dev.timelineAt)}
                              {' · '}
                              {t('home.briefingEvidence', { count: dev.evidenceCount })}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-0.5 text-right text-[12px] tabular-nums text-neutral-400">
                    <b className="block text-[13px] font-medium leading-none text-neutral-900">
                      {topic.developmentCount}
                    </b>
                    {topic.badge === 'important' ? (
                      <span className="mt-1 block text-[10px] font-medium text-[#b85c4b]">
                        {t('home.briefingBadgeImportant')}
                      </span>
                    ) : null}
                    {topic.badge === 'high' ? (
                      <span className="mt-1 block text-[10px] font-medium text-[#8a6a2f]">
                        {t('home.briefingBadgeHigh')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {quietTopics.length > 0 ? (
        <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
          {t('home.briefingQuiet', {
            names: quietTopics.map((q) => q.title).join(' · '),
          })}
        </p>
      ) : null}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3.5 text-[13px] text-neutral-500">
        <span>{t('home.briefingFootHint')}</span>
        <button
          type="button"
          onClick={onGoFollowing}
          className="font-medium text-neutral-900 underline decoration-neutral-900 underline-offset-2"
        >
          {stats.pulseCount > 0
            ? t('home.briefingFootFollowing', { count: stats.pulseCount })
            : t('home.briefingFootFollowingEmpty')}
        </button>
      </footer>
    </div>
  );
}

function formatAxisClock(ms: number, timeZone: string): string {
  if (!Number.isFinite(ms)) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(new Date(ms));
  } catch {
    const d = new Date(ms);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }
}
