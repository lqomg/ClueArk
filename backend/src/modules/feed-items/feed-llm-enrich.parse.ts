import { SUPPORTED_LOCALES, type SupportedLocale } from '../../common/utils/locale.utils';
import type { FeedItemLlmLocaleContent } from './schemas/feed-item-llm.schema';

const MAX_TAGS = 6;
const MAX_TAG_KEYS = 6;
const MAX_TAG_LEN = 24;
const MAX_TAG_KEY_LEN = 48;
const MAX_REASON_LEN = 120;

export type ParsedEnrichResponse = {
  tagKeys: string[];
  locales: Record<SupportedLocale, FeedItemLlmLocaleContent>;
};

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_TAGS; i++) {
    const t = String(raw[i] ?? '')
      .trim()
      .slice(0, MAX_TAG_LEN);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function normalizeTagKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_TAG_KEYS; i++) {
    const t = String(raw[i] ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_TAG_KEY_LEN);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function normalizeReason(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  return s.slice(0, MAX_REASON_LEN);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function parseAndValidateEnrichResponse(raw: unknown): ParsedEnrichResponse {
  if (!isRecord(raw)) throw new Error('LLM 返回格式无效');

  const tagKeys = normalizeTagKeys(raw.tagKeys);
  if (tagKeys.length < 2) throw new Error('LLM tagKeys 不足');

  const localesRaw = raw.locales;
  if (!isRecord(localesRaw)) throw new Error('LLM locales 缺失');

  const locales = {} as Record<SupportedLocale, FeedItemLlmLocaleContent>;
  for (const loc of SUPPORTED_LOCALES) {
    const entry = localesRaw[loc];
    if (!isRecord(entry)) throw new Error(`LLM locale 缺失: ${loc}`);
    const tags = normalizeTags(entry.tags);
    if (!tags.length) throw new Error(`LLM tags 为空: ${loc}`);
    const recommendReason = normalizeReason(entry.recommendReason);
    if (!recommendReason) throw new Error(`LLM recommendReason 为空: ${loc}`);
    locales[loc] = { tags, recommendReason };
  }

  return { tagKeys, locales };
}
