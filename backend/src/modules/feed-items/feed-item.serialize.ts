import { Types } from 'mongoose';
import type { FeedLlmView } from './feed-item-llm.service';

function publishedAtToIso(doc: Record<string, unknown>): string {
  const pa = doc.publishedAt;
  if (pa instanceof Date && !Number.isNaN(pa.getTime())) return pa.toISOString();
  throw new Error('feed_item_published_at_required');
}

export function serializeFeedItem(doc: Record<string, unknown>, llmView?: FeedLlmView | null) {
  const sid = doc.sourceId;
  let sourceDisplayName = '';
  let sourceIdStr = '';
  if (sid && typeof sid === 'object' && '_id' in sid) {
    const o = sid as { _id: Types.ObjectId; displayName?: string };
    sourceIdStr = String(o._id);
    sourceDisplayName = o.displayName ?? '';
  } else if (sid instanceof Types.ObjectId) {
    sourceIdStr = String(sid);
  } else if (typeof sid === 'string') {
    sourceIdStr = sid;
  }

  const tags = llmView?.tags?.length ? llmView.tags : [];
  const recommendReason = llmView?.recommendReason ?? '';
  const llmStatus = llmView?.status ?? 'pending';

  return {
    id: String(doc._id),
    sourceId: sourceIdStr,
    sourceDisplayName,
    title: doc.title as string,
    link: doc.link as string,
    summary: (doc.summary as string) ?? '',
    publishedAt: publishedAtToIso(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    tags,
    recommendReason,
    llmStatus,
  };
}
