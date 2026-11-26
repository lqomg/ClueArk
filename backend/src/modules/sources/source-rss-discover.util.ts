/** 从 HTML 中发现 RSS/Atom 订阅链接（衡 suggest 探针用）。 */

const ALTERNATE_RE =
  /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]*>/gi;
const TYPE_FEED_RE = /type=["'](application\/(rss|atom)\+xml|text\/xml)["']/i;
const HREF_RE = /href=["']([^"']+)["']/i;

export function discoverRssFeedUrlsFromHtml(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }

  const push = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    try {
      const abs = new URL(t, base).toString();
      if (seen.has(abs)) return;
      seen.add(abs);
      out.push(abs);
    } catch {
      /* ignore */
    }
  };

  for (const tag of html.match(ALTERNATE_RE) ?? []) {
    if (!TYPE_FEED_RE.test(tag)) continue;
    const href = tag.match(HREF_RE)?.[1];
    if (href) push(href);
  }

  // 只认页内 alternate；禁止再猜 /feed /rss /atom.xml（会制造大量验收失败尸骸）
  return out.slice(0, 5);
}

/** 跳转到错误页 / 404 的 URL，不可作 suggest 验收目标 */
export function isJunkSuggestTargetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = `${u.pathname}${u.search}`.toLowerCase();
    if (host.startsWith('error.') || host.includes('.error.')) return true;
    return /(?:^|\/)(?:error|404|page-not-found|notfound)(?:\/|$|\.)|tbpc\/error|search\/error/i.test(
      path,
    );
  } catch {
    return true;
  }
}

/** 仅主机根路径：不适合直接当 RSS feed 试采 */
export function isBareHostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = (u.pathname || '/').replace(/\/+$/, '') || '/';
    return path === '/';
  } catch {
    return true;
  }
}

export function looksLikeSitemapUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return path.endsWith('.xml') && (path.includes('sitemap') || path.endsWith('/sitemap.xml'));
  } catch {
    return false;
  }
}

/** 解析 X / Twitter 主页或 @handle */
export function parseXScreenNameFromUrlOrHandle(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^@?[A-Za-z0-9_]{1,15}$/.test(t)) {
    return t.replace(/^@/, '');
  }
  try {
    const u = new URL(t);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'x.com' && host !== 'twitter.com' && host !== 'mobile.twitter.com') {
      return null;
    }
    const seg = u.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!seg || ['home', 'explore', 'search', 'i', 'intent', 'share'].includes(seg.toLowerCase())) {
      return null;
    }
    if (!/^[A-Za-z0-9_]{1,15}$/.test(seg)) return null;
    return seg;
  } catch {
    return null;
  }
}
