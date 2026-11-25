import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonitorDevelopment, listDevelopmentEvidence } from '@/api/developments';
import { getMonitor } from '@/api/monitors';
import type { DevelopmentEvidenceItem, MonitorDevelopment } from '@/types/models';
import { SourceAvatar } from '@/components/sources/SourceAvatar';
import { relTimeIso } from '@/lib/datetime';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { cn } from '@/lib/cn';
import { topicTimelinePath } from '@/pages/app/topics/paths';

export function TopicDevelopmentPage() {
  const { id = '', developmentId = '' } = useParams<{ id: string; developmentId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [development, setDevelopment] = useState<MonitorDevelopment | null>(null);
  const [evidence, setEvidence] = useState<DevelopmentEvidenceItem[]>([]);
  const [topicTitle, setTopicTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !developmentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDevelopment(null);
    setEvidence([]);
    void Promise.all([
      getMonitorDevelopment(id, developmentId),
      listDevelopmentEvidence(id, developmentId).catch(() => ({ items: [] as DevelopmentEvidenceItem[] })),
      getMonitor(id).catch(() => null),
    ])
      .then(([detail, evidenceRes, monitor]) => {
        if (cancelled) return;
        setDevelopment(detail);
        setEvidence(evidenceRes.items);
        setTopicTitle(monitor?.title?.trim() || null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, developmentId, t]);

  const topicPath = topicTimelinePath(id);
  const backLabel = topicTitle || t('topic.backToTopic');

  if (loading && !development) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        {t('common.loading')}
      </div>
    );
  }

  if (error || !development) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4 px-2">
        <p className="text-sm text-red-600">{error || t('common.loadFailed')}</p>
        <button
          type="button"
          onClick={() => navigate(topicPath)}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('topic.backToTopic')}
        </button>
      </div>
    );
  }

  const body = development.whyItMatters?.trim() || development.summary?.trim() || '';
  const beats = [...(development.updates ?? [])].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl pb-12">
        <header className="mb-6 flex items-center gap-3 border-b border-neutral-200 pb-4">
          <Link
            to={topicPath}
            className="inline-flex min-w-0 items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900"
            title={backLabel}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{backLabel}</span>
          </Link>
        </header>

        <article>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
            {development.occurredAt || development.timelineAt ? (
              <time dateTime={development.occurredAt || development.timelineAt}>
                {relTimeIso(development.occurredAt || development.timelineAt)}
              </time>
            ) : null}
            {development.severity ? (
              <span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
                {development.severity}
              </span>
            ) : null}
            {development.type ? (
              <span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-neutral-500">
                {development.type}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-[clamp(1.35rem,2.5vw,1.85rem)] font-semibold leading-tight tracking-tight text-neutral-900">
            {development.title}
          </h1>

          {(development.primarySourceDisplayName || development.sourcePreviews?.[0]) && (
            <div className="mt-4 inline-flex items-center gap-2 text-[12px] text-neutral-500">
              <SourceAvatar
                kind="rss"
                name={
                  development.primarySourceDisplayName ??
                  development.sourcePreviews?.[0]?.displayName ??
                  ''
                }
                avatarUrl={
                  development.primarySourceAvatarUrl ??
                  development.sourcePreviews?.[0]?.avatarUrl ??
                  null
                }
                size="sm"
              />
              <span>
                {development.primarySourceDisplayName ??
                  development.sourcePreviews?.[0]?.displayName}
              </span>
            </div>
          )}

          {body ? (
            <p className="mt-6 max-w-[68ch] text-[15px] leading-7 text-neutral-600 whitespace-pre-wrap">
              {body}
            </p>
          ) : null}

          {development.watchNext?.trim() ? (
            <p className="mt-4 text-[13px] leading-6 text-neutral-500">
              <span className="font-medium text-neutral-500">{t('topic.watchNext')}: </span>
              {development.watchNext.trim()}
            </p>
          ) : null}

          {beats.length > 1 ? (
            <section className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t('topic.beatsTitle')}
              </h2>
              <ol className="space-y-2">
                {beats.map((beat, index) => (
                  <li
                    key={`${beat.at}-${beat.feedItemId ?? 'none'}-${index}`}
                    className="flex items-baseline gap-2 text-[13px] text-neutral-600"
                  >
                    <span className="shrink-0 tabular-nums text-neutral-400">
                      {relTimeIso(beat.at)}
                    </span>
                    <span className="min-w-0 leading-snug">{beat.title.trim() || '—'}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="mt-10 border-t border-neutral-200 pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('topic.evidenceTitle')}
            </h2>
            {evidence.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">{t('topic.evidenceEmpty')}</p>
            ) : (
              <ul className="mt-4 m-0 flex list-none flex-col p-0">
                {evidence.map((item) => (
                  <li
                    key={item.feedItemId}
                    className={cn(
                      'border-b border-neutral-200 py-4 first:pt-0 last:border-0',
                      item.isPrimary && 'rounded-lg bg-neutral-50 px-3',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <SourceAvatar
                        kind="rss"
                        name={item.sourceDisplayName}
                        avatarUrl={item.sourceAvatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                          <span>{item.sourceDisplayName}</span>
                          {item.publishedAt ? (
                            <time dateTime={item.publishedAt}>{relTimeIso(item.publishedAt)}</time>
                          ) : null}
                          {item.isPrimary ? (
                            <span className="text-neutral-800">{t('topic.primaryEvidence')}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[14px] font-medium leading-snug text-neutral-800">
                          {item.title}
                        </p>
                        {item.summary ? (
                          <p className="mt-1 line-clamp-3 text-[12px] leading-5 text-neutral-500">
                            {item.summary}
                          </p>
                        ) : null}
                        {item.link ? (
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-1 text-[12px] text-neutral-800 hover:underline"
                            onClick={() => openExternalUrl(item.link)}
                          >
                            <ExternalLink className="size-3" aria-hidden />
                            {t('home.viewOriginal')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>
      </div>
    </div>
  );
}
