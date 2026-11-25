import { parse, type HTMLElement } from 'node-html-parser';
import { fingerprintUrlKey } from '../sources/fingerprint.util';
import {
  normalizePublishedAtWithPrecision,
  utcMidnightFromYmd,
} from './published-at.util';

export type WebSourceMode = 'list' | 'sitemap' | 'single_page';

export type WebSourceExtractionInput = {
  html: string;
  baseUrl: string;
  mode: WebSourceMode;
  listItemSelector?: string;
  linkSelector?: string;
  titleSelector?: string;
  summarySelector?: string;
  publishedAtSelector?: string;
  maxItems?: number;
};

export type ExtractedWebSourceItem = {
  link: string;
  title: string;
  summary: string;
  publishedAt: Date | null;
};

const DEFAULT_MAX_ITEMS = 80;

function textOf(node: HTMLElement | null | undefined): string {
  if (!node) return '';
  return node.text.replace(/\s+/g, ' ').trim();
}

function attrOf(node: HTMLElement | null | undefined, name: string): string {
  return node?.getAttribute(name)?.trim() ?? '';
}

function truncate(value: string, max: number): string {
  const t = value.trim();
  return t.length <= max ? t : t.slice(0, max);
}

function absoluteUrl(raw: string, baseUrl: string): string | null {
  const t = raw.trim();
  if (!t || t.startsWith('#') || /^javascript:/i.test(t) || /^mailto:/i.test(t)) return null;
  try {
    const u = new URL(t, baseUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function normalizedDedupeKey(url: string): string {
  return fingerprintUrlKey(url) ?? url;
}

const EN_MONTH_IN_TEXT_RE =
  /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})\b/i;

/** 解析常见日期文本；支持「日 + 年月」拆分拼成的脏串（如 302026.10 → 2026-10-30） */
export function parseFlexibleDateText(raw: string): Date | null {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // ISO/RFC 含钟点：先于日精度 ymd，避免 "2026-06-28T12:00:00Z" 被截成午夜
  if (/^\d{4}-\d{2}-\d{2}T/.test(t) || /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:/.test(t)) {
    const withClock = new Date(t);
    if (!Number.isNaN(withClock.getTime())) return withClock;
  }

  // 标题内嵌英文月日年（先于宽松 Date.parse，避免宿主本地时区把日精度拧成前一天）
  const enEmbed = t.match(EN_MONTH_IN_TEXT_RE);
  if (enEmbed) {
    const parsed = normalizePublishedAtWithPrecision(enEmbed[1]);
    if (parsed) return parsed.date;
  }

  const ymd = t.match(/(20\d{2})[./\-年](\d{1,2})[./\-月](\d{1,2})/);
  if (ymd) {
    const d = utcMidnightFromYmd(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
    if (d) return d;
  }

  // 清华首页：子节点顺序常为 <b>日</b><em>年月</em> → 文本 "302026.10"（须先于「年月」子串匹配）
  const glued = t.match(/^(\d{1,2})(20\d{2})[./\-](\d{1,2})$/);
  if (glued) {
    const day = Number(glued[1]);
    const year = Number(glued[2]);
    const month = Number(glued[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = utcMidnightFromYmd(year, month, day);
      if (d) return d;
    }
  }

  const ymOnly = t.match(/^(20\d{2})[./\-年](\d{1,2})$/);
  if (ymOnly) {
    const d = utcMidnightFromYmd(Number(ymOnly[1]), Number(ymOnly[2]), 1);
    if (d) return d;
  }

  // 仅对「看起来像整段日期」的短串兜底 Date.parse，避免长标题被宿主时区误解析
  if (t.length <= 40) {
    const isoTry = new Date(t);
    if (!Number.isNaN(isoTry.getTime()) && t.length >= 8) return isoTry;
  }

  return null;
}

function parseDateFromNode(node: HTMLElement | null | undefined): Date | null {
  if (!node) return null;
  const raw = attrOf(node, 'datetime') || attrOf(node, 'content') || textOf(node);
  if (!raw) return null;
  return parseFlexibleDateText(raw);
}

function nodeBySelector(root: HTMLElement, selector?: string): HTMLElement | null {
  if (!selector?.trim()) return null;
  try {
    return root.querySelector(selector.trim());
  } catch {
    return null;
  }
}

function isUrlLikeTitle(title: string, link: string): boolean {
  const t = title.trim();
  if (/^https?:\/\//i.test(t)) return true;
  if (t === link) return true;
  return false;
}

function extractFromArticleNode(
  node: HTMLElement,
  input: WebSourceExtractionInput,
): ExtractedWebSourceItem | null {
  const linkNode = nodeBySelector(node, input.linkSelector) ?? node.querySelector('a[href]');
  const link = absoluteUrl(attrOf(linkNode, 'href'), input.baseUrl);
  if (!link) return null;

  const title =
    textOf(nodeBySelector(node, input.titleSelector)) ||
    attrOf(linkNode, 'title') ||
    textOf(linkNode);
  if (!title) return null;
  if (input.mode === 'list' && isUrlLikeTitle(title, link)) return null;

  const summary =
    textOf(nodeBySelector(node, input.summarySelector)) ||
    textOf(node.querySelector('p')) ||
    textOf(node);

  const fromNode = parseDateFromNode(
    nodeBySelector(node, input.publishedAtSelector) ?? node.querySelector('time'),
  );
  return {
    link,
    title: truncate(title, 500),
    summary: truncate(summary || title, 50000),
    publishedAt: fromNode ?? parseFlexibleDateText(title),
  };
}

function extractListItems(input: WebSourceExtractionInput): ExtractedWebSourceItem[] {
  const root = parse(input.html);
  const maxItems = Math.max(1, Math.min(input.maxItems ?? DEFAULT_MAX_ITEMS, DEFAULT_MAX_ITEMS));
  let nodes: HTMLElement[];
  try {
    nodes = input.listItemSelector?.trim()
      ? root.querySelectorAll(input.listItemSelector.trim())
      : root.querySelectorAll('article, li, .item, .news-item');
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: ExtractedWebSourceItem[] = [];

  for (const node of nodes) {
    const item = extractFromArticleNode(node, input);
    if (!item) continue;
    const key = normalizedDedupeKey(item.link);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

function extractSinglePageItem(input: WebSourceExtractionInput): ExtractedWebSourceItem[] {
  const root = parse(input.html);
  const title =
    textOf(nodeBySelector(root, input.titleSelector)) ||
    textOf(root.querySelector('h1')) ||
    textOf(root.querySelector('title'));
  const link = absoluteUrl(input.baseUrl, input.baseUrl);
  if (!title || !link) return [];
  const summary =
    textOf(nodeBySelector(root, input.summarySelector)) ||
    textOf(root.querySelector('main')) ||
    textOf(root.querySelector('article')) ||
    title;
  return [
    {
      link,
      title: truncate(title, 500),
      summary: truncate(summary, 50000),
      publishedAt: parseDateFromNode(
        nodeBySelector(root, input.publishedAtSelector) ?? root.querySelector('time'),
      ),
    },
  ];
}

function extractSitemapItems(input: WebSourceExtractionInput): ExtractedWebSourceItem[] {
  const root = parse(input.html);
  const maxItems = Math.max(1, Math.min(input.maxItems ?? DEFAULT_MAX_ITEMS, DEFAULT_MAX_ITEMS));
  const seen = new Set<string>();
  const out: ExtractedWebSourceItem[] = [];
  for (const node of root.querySelectorAll('url')) {
    const rawLoc = textOf(node.querySelector('loc'));
    const link = absoluteUrl(rawLoc, input.baseUrl);
    if (!link) continue;
    const key = normalizedDedupeKey(link);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      link,
      title: truncate(link, 500),
      summary: link,
      publishedAt: parseDateFromNode(node.querySelector('lastmod')),
    });
    if (out.length >= maxItems) break;
  }
  return out;
}

export function extractWebSourceItems(input: WebSourceExtractionInput): ExtractedWebSourceItem[] {
  if (input.mode === 'single_page') return extractSinglePageItem(input);
  if (input.mode === 'sitemap') return extractSitemapItems(input);
  return extractListItems(input);
}
