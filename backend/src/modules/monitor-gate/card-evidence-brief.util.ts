import { Types } from 'mongoose';
import { COLD_START } from './cold-start.defaults';
import { clipDevelopmentBlurb } from './development-evidence-pack.util';

export type CardEvidenceSourceRow = {
  id: string;
  sourceId: string;
  title: string;
  summary: string;
  publishedAt: Date | string;
  sourceDisplayName?: string;
};

export type CardEvidenceBrief = {
  publishedAt: string;
  sourceDisplayName: string;
  title: string;
  quote: string;
};

function publishedMs(value: Date | string): number {
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : Number.NaN;
}

function toIso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * 从卡上证据选出写作简报：primary 必留，其余按 publishedAt 新→旧，
 * 同一 sourceId 最多 1 条（primary 优先），排除当前新稿。
 */
export function selectCardEvidenceBriefs(params: {
  evidenceItemIds: string[];
  primaryEvidenceItemId?: string | null;
  excludeFeedItemId?: string | null;
  items: CardEvidenceSourceRow[];
  cap?: number;
}): CardEvidenceBrief[] {
  const cap = Math.max(1, Math.floor(Number(params.cap) || COLD_START.cardEvidenceBriefCap));
  const exclude = String(params.excludeFeedItemId ?? '').trim();
  const primary = String(params.primaryEvidenceItemId ?? '').trim();
  const byId = new Map<string, CardEvidenceSourceRow>();
  for (const row of params.items) {
    const id = String(row.id ?? '').trim();
    if (!id || !Types.ObjectId.isValid(id) || id === exclude) continue;
    if (!Number.isFinite(publishedMs(row.publishedAt))) continue;
    byId.set(id, row);
  }

  const eligible: CardEvidenceSourceRow[] = [];
  const seen = new Set<string>();
  for (const raw of params.evidenceItemIds) {
    const id = String(raw ?? '').trim();
    if (!id || id === exclude || seen.has(id)) continue;
    const row = byId.get(id);
    if (!row) continue;
    seen.add(id);
    eligible.push(row);
  }

  eligible.sort((a, b) => {
    const dt = publishedMs(b.publishedAt) - publishedMs(a.publishedAt);
    return dt !== 0 ? dt : b.id.localeCompare(a.id);
  });

  const picked: CardEvidenceSourceRow[] = [];
  const usedSources = new Set<string>();
  const push = (row: CardEvidenceSourceRow): boolean => {
    if (picked.some((r) => r.id === row.id)) return false;
    if (picked.length >= cap) return false;
    picked.push(row);
    const sourceId = String(row.sourceId ?? '').trim();
    if (sourceId) usedSources.add(sourceId);
    return true;
  };

  const primaryRow = primary ? eligible.find((r) => r.id === primary) : undefined;
  if (primaryRow) push(primaryRow);

  for (const row of eligible) {
    if (picked.length >= cap) break;
    const sourceId = String(row.sourceId ?? '').trim();
    if (sourceId && usedSources.has(sourceId)) continue;
    push(row);
  }

  return picked.map((row) => ({
    publishedAt: toIso(row.publishedAt),
    sourceDisplayName: String(row.sourceDisplayName ?? '').trim(),
    title: clipDevelopmentBlurb(String(row.title ?? ''), COLD_START.cardEvidenceTitleMax),
    quote: clipDevelopmentBlurb(String(row.summary ?? ''), COLD_START.cardEvidenceQuoteMax),
  }));
}
