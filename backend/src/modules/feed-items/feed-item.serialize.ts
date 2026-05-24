import { Types } from 'mongoose';

function publishedAtToIso(doc: Record<string, unknown>): string {
  const pa = doc.publishedAt;
  if (pa instanceof Date && !Number.isNaN(pa.getTime())) return pa.toISOString();
  throw new Error('feed_item_published_at_required');
}

export function serializeFeedItem(doc: Record<string, unknown>) {
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

  const rawTags = doc.llmTags;
  const tags = Array.isArray(rawTags) && rawTags.length ? rawTags.map(String) : [];
  const recommendReason = String(doc.llmRecommendReason ?? '');
  const llmStatus = doc.llmStatus as string | undefined;

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
    llmStatus: llmStatus ?? 'pending',
  };
}
