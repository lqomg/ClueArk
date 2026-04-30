import { createHash } from 'crypto';
import { SOURCE_KIND, type SourceKind } from './source-kind';

/** URL 指纹：去 hash；去掉常见跟踪参数；host 小写 */
export function fingerprintUrlKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    const params = u.searchParams;
    const drop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    for (const k of drop) params.delete(k);
    const qs = params.toString();
    u.search = qs ? `?${qs}` : '';
    const host = u.hostname.toLowerCase();
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return null;
  }
}

export function buildFingerprint(
  kind: SourceKind,
  input: {
    webUrl?: string;
    rssFeedUrl?: string;
    hotUrl?: string;
  },
): string | null {
  if (kind === SOURCE_KIND.WEB) {
    const key = input.webUrl ? fingerprintUrlKey(input.webUrl) : null;
    return key ? `web|${key}` : null;
  }
  if (kind === SOURCE_KIND.RSS) {
    const key = input.rssFeedUrl ? fingerprintUrlKey(input.rssFeedUrl) : null;
    return key ? `rss|${key}` : null;
  }
  if (kind === SOURCE_KIND.HOT_API) {
    const key = input.hotUrl ? fingerprintUrlKey(input.hotUrl) : null;
    return key ? `hot|${key}` : null;
  }
  return null;
}

export function openUrlForSource(
  kind: SourceKind,
  web?: { url?: string },
  rss?: { feedUrl?: string; siteUrl?: string },
  hot?: { url?: string },
): string {
  if (kind === SOURCE_KIND.WEB && web?.url) return web.url;
  if (kind === SOURCE_KIND.RSS) {
    if (rss?.feedUrl) return rss.feedUrl;
    if (rss?.siteUrl) return rss.siteUrl;
  }
  if (kind === SOURCE_KIND.HOT_API && hot?.url?.trim()) return hot.url.trim();
  return '';
}
