import { Types } from 'mongoose';
import type { FeedLlmView } from '../feed-items/feed-item-llm.service';

const SUMMARY_PREVIEW_MAX = 160;

export type NotificationListFeedContext = {
  sourceDisplayName: string;
  recommendReason: string;
  summaryPreview: string;
  llmStatus: string;
};

export type NotificationListItemDto = {
  id: string;
  monitorId: string;
  monitorTitle: string;
  feedItemId: string;
  score: number;
  title: string;
  link: string;
  readAt: string | null;
  createdAt: string | null;
  sourceDisplayName: string;
  recommendReason: string;
  summaryPreview: string;
  llmStatus: string;
  alertLabel: string;
};

export function summaryPreview(summary: string): string {
  const s = summary.trim();
  if (s.length <= SUMMARY_PREVIEW_MAX) return s;
  return `${s.slice(0, SUMMARY_PREVIEW_MAX)}…`;
}

export function feedContextFromDoc(
  doc: Record<string, unknown> | undefined,
): NotificationListFeedContext {
  if (!doc) {
    return {
      sourceDisplayName: '',
      recommendReason: '',
      summaryPreview: '',
      llmStatus: 'pending',
    };
  }
  const sid = doc.sourceId;
  let sourceDisplayName = '';
  if (sid && typeof sid === 'object' && 'displayName' in sid) {
    sourceDisplayName = String((sid as { displayName?: string }).displayName ?? '').trim();
  }
  const summary = String(doc.summary ?? '').trim();
  return {
    sourceDisplayName,
    recommendReason: '',
    summaryPreview: summaryPreview(summary),
    llmStatus: 'pending',
  };
}

export function feedContextWithLlm(
  base: NotificationListFeedContext,
  llmView: FeedLlmView,
): NotificationListFeedContext {
  return {
    ...base,
    recommendReason: llmView.recommendReason || base.recommendReason,
    llmStatus: llmView.status || base.llmStatus,
  };
}

export function toNotificationListItemDto(
  n: {
    _id: Types.ObjectId;
    monitorId: Types.ObjectId;
    monitorTitle?: string;
    feedItemId: Types.ObjectId;
    score: number;
    title: string;
    link: string;
    readAt?: Date | null;
    createdAt?: Date;
  },
  feed?: NotificationListFeedContext,
  alertLabel = '',
): NotificationListItemDto {
  const ctx = feed ?? feedContextFromDoc(undefined);
  return {
    id: String(n._id),
    monitorId: String(n.monitorId),
    monitorTitle: (n.monitorTitle ?? '').trim(),
    feedItemId: String(n.feedItemId),
    score: n.score,
    title: n.title,
    link: n.link,
    readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
    sourceDisplayName: ctx.sourceDisplayName,
    recommendReason: ctx.recommendReason,
    summaryPreview: ctx.summaryPreview,
    llmStatus: ctx.llmStatus,
    alertLabel,
  };
}
