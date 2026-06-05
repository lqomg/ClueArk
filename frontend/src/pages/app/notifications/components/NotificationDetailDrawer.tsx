import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NotificationItem } from '@/types/models';
import { Drawer, Button } from '@/components/ui';
import { relTimeIso } from '@/lib/datetime';
import { getFeedItemTranslation } from '@/api/feedItems';

function reasonBlock(n: NotificationItem): string {
  if (n.recommendReason.trim()) return n.recommendReason.trim();
  if (n.llmStatus === 'pending' || n.llmStatus === 'processing') return '…';
  if (n.llmStatus === 'failed') return '—';
  return '—';
}

export function NotificationDetailDrawer({
  item,
  open,
  onClose,
  onMarkRead,
  marking,
}: {
  item: NotificationItem | null;
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  marking: boolean;
}) {
  const { t } = useTranslation();
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedSummary, setTranslatedSummary] = useState('');
  const [translating, setTranslating] = useState(false);

  if (!item) return null;
  const monitorLabel = item.monitorTitle.trim() || item.monitorId;
  const timelineTo = `/app/monitors/${encodeURIComponent(item.monitorId)}/timeline`;
  const displayTitle = showTranslation && translatedTitle ? translatedTitle : item.title;
  const displaySummary =
    showTranslation && translatedSummary ? translatedSummary : item.summaryPreview?.trim() ?? '';

  async function toggleTranslation() {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    setTranslating(true);
    try {
      const res = await getFeedItemTranslation(item!.feedItemId);
      setTranslatedTitle(res.title);
      setTranslatedSummary(res.summary);
      setShowTranslation(true);
    } catch {
      // keep original
    } finally {
      setTranslating(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('notifications.detail')}
      description={monitorLabel}
      panelClassName="sm:max-w-lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Link to={timelineTo} onClick={onClose}>
            <Button type="button" variant="primary" size="sm">
              {t('notifications.openTimeline')}
            </Button>
          </Link>
          {item.link ? (
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                {t('notifications.openSource')}
              </Button>
            </a>
          ) : null}
          <Button type="button" variant="outline" size="sm" disabled={translating} onClick={() => void toggleTranslation()}>
            {translating ? t('feed.translating') : showTranslation ? t('feed.showOriginal') : t('feed.translate')}
          </Button>
          {!item.readAt ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={marking}
              onClick={() => onMarkRead(item.id)}
            >
              {t('notifications.markRead')}
            </Button>
          ) : (
            <span className="self-center text-[11px] text-slate-500">{t('notifications.read')}</span>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {item.sourceDisplayName ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Source</p>
            <p className="mt-1 text-slate-300">{item.sourceDisplayName}</p>
          </div>
        ) : null}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Title</p>
          <p className="mt-1 font-medium leading-snug text-slate-100">{displayTitle}</p>
        </div>
        {displaySummary ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Summary</p>
            <p className="mt-1 leading-relaxed text-slate-400">{displaySummary}</p>
          </div>
        ) : null}
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/90">Reason</p>
          <p className="mt-1 leading-relaxed text-emerald-100/90">{reasonBlock(item)}</p>
        </div>
        {item.createdAt ? (
          <p className="text-[11px] text-slate-600">{relTimeIso(item.createdAt)}</p>
        ) : null}
      </div>
    </Drawer>
  );
}
