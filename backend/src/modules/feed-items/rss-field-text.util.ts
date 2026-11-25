/**
 * rss-parser / xml2js 常将带 HTML 的字段解析为对象（如 Fierce Biotech 的 title 内嵌 <a>）。
 * 入库前统一提取为纯文本或 URL 字符串。
 */

function trimOrEmpty(s: string): string {
  return s.trim();
}

/** 从 rss-parser 字段提取可读文本（title / summary / content 等） */
export function rssFieldText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return trimOrEmpty(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return trimOrEmpty(value.map((v) => rssFieldText(v)).filter(Boolean).join(' '));
  }

  if (typeof value !== 'object') return '';

  const o = value as Record<string, unknown>;
  if (typeof o._ === 'string') return trimOrEmpty(o._);
  if (typeof o['#text'] === 'string') return trimOrEmpty(o['#text']);
  if (typeof o.value === 'string') return trimOrEmpty(o.value);

  const parts: string[] = [];
  for (const key of Object.keys(o)) {
    if (key === '$') continue;
    const part = rssFieldText(o[key]);
    if (part) parts.push(part);
  }
  return trimOrEmpty(parts.join(' '));
}

/**
 * 选入库用的 RSS 摘要原文。
 * 勿优先 contentSnippet：Product Hunt Atom 等源的 snippet 会丢掉 tagline，只剩 “Discussion | Link”。
 * 在 content / summary / description / contentSnippet 中取去标签后最长、且非纯导航文案的候选。
 */
export function pickRssSummaryFieldText(item: {
  content?: unknown;
  summary?: unknown;
  description?: unknown;
  contentSnippet?: unknown;
  'content:encoded'?: unknown;
}): string {
  const rawCandidates = [
    rssFieldText(item.content),
    rssFieldText(item['content:encoded']),
    rssFieldText(item.summary),
    rssFieldText(item.description),
    rssFieldText(item.contentSnippet),
  ].filter(Boolean);

  let best = '';
  let bestScore = -1;
  for (const raw of rawCandidates) {
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    // PH Atom 等：链接导航被当成 snippet
    const navOnly = /^(discussion\s*\|\s*link|link\s*\|\s*discussion)$/i.test(text);
    const score = navOnly ? 0 : text.length;
    if (score > bestScore) {
      best = text;
      bestScore = score;
    }
  }
  return best;
}

function hrefFromAttrs(attrs: unknown): string | null {
  if (!attrs || typeof attrs !== 'object') return null;
  const href = (attrs as Record<string, unknown>).href;
  if (typeof href === 'string' && href.trim()) return href.trim();
  return null;
}

/** 从 link / guid 等字段提取 URL 或相对路径 */
export function rssFieldLink(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const t = String(value).trim();
    return t || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const link = rssFieldLink(item);
      if (link) return link;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  const o = value as Record<string, unknown>;
  const directHref = hrefFromAttrs(o.$) ?? (typeof o.href === 'string' ? o.href.trim() : null);
  if (directHref) return directHref;

  if (Array.isArray(o.a)) {
    for (const a of o.a) {
      const link = rssFieldLink(a);
      if (link) return link;
    }
  }

  const text = rssFieldText(value);
  if (/^https?:\/\//i.test(text)) return text;

  return null;
}
