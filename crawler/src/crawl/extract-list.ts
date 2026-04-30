import * as cheerio from 'cheerio';
import type { CrawlResultEntry, SelectorProfile } from './crawl.types';

function stripTags(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function toAbsolute(base: string, href: string | undefined): string | null {
  const t = href?.trim();
  if (!t) return null;
  try {
    return new URL(t, base).toString();
  } catch {
    return null;
  }
}

function parseDateText(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** 通用默认：常见文章列表（多数站点需传入自定义 selectors） */
export const defaultSelectorProfile: SelectorProfile = {
  item: 'article',
  link: 'a[href]',
  title: 'h1 a, h2 a, h3 a, h2, h3',
  summary: 'p',
  date: 'time[datetime]',
};

export function extractListEntries(
  listPageUrl: string,
  html: string,
  profile: SelectorProfile,
  maxItems: number,
): { items: CrawlResultEntry[]; errors: string[] } {
  const errors: string[] = [];
  const $ = cheerio.load(html);
  const items: CrawlResultEntry[] = [];
  const seen = new Set<string>();

  $(profile.item).each((_, el) => {
    if (items.length >= maxItems) return false;
    const $item = $(el);
    const $link = $item.find(profile.link).first();
    const href = $link.attr('href') ?? $link.closest('a').attr('href');
    const link = toAbsolute(listPageUrl, href);
    if (!link || seen.has(link)) return;
    seen.add(link);

    let title = stripTags($item.find(profile.title).first().text());
    if (!title) title = stripTags($link.text());
    if (!title) return;

    let summary = '';
    if (profile.summary) {
      summary = truncate(stripTags($item.find(profile.summary).first().text()), 8000);
    }

    let publishedAt: string | null = null;
    if (profile.date) {
      const $time = $item.find(profile.date).first();
      const iso = $time.attr('datetime') ?? $time.text();
      publishedAt = parseDateText(iso ?? undefined);
    }

    items.push({
      link,
      title: truncate(title, 500),
      summary,
      publishedAt,
      guid: '',
    });
    return undefined;
  });

  if (items.length === 0) {
    errors.push('未匹配到任何条目，请检查 listUrl 与 selectors（多数站点需自定义 item/link/title）');
  }

  return { items, errors };
}
