import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SourceAvatar } from '@/components/sources/SourceAvatar';
import { relTimeIso } from '@/lib/datetime';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { cn } from '@/lib/cn';

type PrimaryEvidence = {
  feedItemId: string;
  title: string;
  link: string;
};

type Props = {
  title: string;
  summary: string;
  timelineAt: string;
  lastMeaningfulAt?: string | null;
  showSubstantiveUpdate?: boolean;
  sourceName: string;
  sourceAvatarUrl?: string | null;
  href: string;
  primaryEvidence?: PrimaryEvidence | null;
  evidenceCount: number;
};

export function TopicChangeRow({
  title,
  summary,
  timelineAt,
  lastMeaningfulAt = null,
  showSubstantiveUpdate = false,
  sourceName,
  sourceAvatarUrl = null,
  href,
  primaryEvidence,
  evidenceCount,
}: Props) {
  const { t } = useTranslation();
  const summaryLine = summary.trim() && summary.trim() !== title.trim() ? summary.trim() : '';
  const evidenceTitle = primaryEvidence?.title.trim() ?? '';
  const evidenceLink = primaryEvidence?.link.trim() ?? '';
  const resolvedSource = sourceName.trim();

  return (
    <article className="relative border-b border-neutral-200 py-5 pl-6">
      <span
        className="absolute left-0 top-7 size-2 -translate-x-1/2 rounded-full bg-neutral-900 ring-2 ring-white"
        aria-hidden
      />
      <Link
        to={href}
        className="block text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] leading-5 text-neutral-500">
          {showSubstantiveUpdate && lastMeaningfulAt ? (
            <>
              <time dateTime={lastMeaningfulAt} className="tabular-nums text-neutral-600">
                {relTimeIso(lastMeaningfulAt)}
              </time>
              {timelineAt ? (
                <time dateTime={timelineAt} className="tabular-nums text-neutral-400">
                  {t('topic.startedOn', { date: relTimeIso(timelineAt) })}
                </time>
              ) : null}
            </>
          ) : timelineAt ? (
            <time dateTime={timelineAt} className="tabular-nums">
              {relTimeIso(timelineAt)}
            </time>
          ) : null}
          {evidenceCount > 0 ? (
            <span className="text-neutral-400">
              {t('topic.evidenceCount', { count: evidenceCount })}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 text-[16px] font-semibold leading-snug text-neutral-900 [overflow-wrap:anywhere]">
          {title}
        </h3>
        {summaryLine ? (
          <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-neutral-500">{summaryLine}</p>
        ) : null}
      </Link>

      {resolvedSource || evidenceTitle || evidenceLink ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          {resolvedSource ? (
            <span className="inline-flex items-center gap-1.5">
              <SourceAvatar
                kind="rss"
                name={resolvedSource}
                avatarUrl={sourceAvatarUrl}
                size="sm"
              />
              <span className="max-w-[12rem] truncate">{resolvedSource}</span>
            </span>
          ) : null}
          {evidenceLink ? (
            <button
              type="button"
              className={cn(
                'inline-flex max-w-full items-center gap-1 truncate text-neutral-500 hover:text-neutral-900',
              )}
              onClick={() => openExternalUrl(evidenceLink)}
              title={evidenceTitle || evidenceLink}
            >
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{evidenceTitle || t('home.viewOriginal')}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
