import { SOURCE_KIND, SOURCE_KINDS, type SourceKind } from './source-kind';
import type { CreateSourceDto } from './dto/create-source.dto';
import type { UpdateSourceDto } from './dto/update-source.dto';

export const SOURCES_JSON_FORMAT = 'clueark-sources' as const;
export const SOURCES_JSON_VERSION = 1 as const;
export const SOURCES_JSON_IMPORT_MAX = 2000 as const;

export type OfficialCreateWithFlags = CreateSourceDto & { enabled?: boolean; sortOrder?: number };

export function normalizeImportSourcesArray(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    if (body.length > SOURCES_JSON_IMPORT_MAX) throw new Error('too_many_sources');
    return body;
  }
  if (body && typeof body === 'object') {
    const src = (body as { sources?: unknown }).sources;
    if (Array.isArray(src)) {
      if (src.length > SOURCES_JSON_IMPORT_MAX) throw new Error('too_many_sources');
      return src;
    }
  }
  throw new Error('invalid_shape');
}

export function isObjectId24(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s);
}

function parseKind(v: unknown): SourceKind | null {
  if (typeof v !== 'string') return null;
  const k = v.trim() as SourceKind;
  return (SOURCE_KINDS as readonly string[]).includes(k) ? (k as SourceKind) : null;
}

type CrawlSelectorsShape = { item: string; link: string; title: string; summary?: string; date?: string };

function parseCrawlSelectorsForCreate(w: Record<string, unknown>): CrawlSelectorsShape | undefined {
  if (!('crawlSelectors' in w)) return undefined;
  const cs = w.crawlSelectors;
  if (cs == null) return undefined;
  if (typeof cs !== 'object' || Array.isArray(cs)) throw new Error('invalid_crawl_selectors');
  const o = cs as Record<string, unknown>;
  const item = typeof o.item === 'string' ? o.item.trim() : '';
  const link = typeof o.link === 'string' ? o.link.trim() : '';
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!item || !link || !title) throw new Error('crawl_selectors_incomplete');
  const summary = typeof o.summary === 'string' ? o.summary.trim() : '';
  const date = typeof o.date === 'string' ? o.date.trim() : '';
  return {
    item,
    link,
    title,
    ...(summary ? { summary } : {}),
    ...(date ? { date } : {}),
  };
}

/** 将导入行解析为「新建官方信源」载荷（与 AdminCreateOfficialSourceDto 一致） */
export function importRowToCreateDto(r: Record<string, unknown>): OfficialCreateWithFlags {
  const kind = parseKind(r.kind);
  if (!kind) throw new Error('invalid_kind');

  const displayName = typeof r.displayName === 'string' ? r.displayName.trim() : '';
  if (!displayName || displayName.length > 200) throw new Error('invalid_display_name');

  const noteRaw = r.note;
  const note = typeof noteRaw === 'string' ? noteRaw.trim() : '';
  if (note.length > 2000) throw new Error('invalid_note');

  const enabled = typeof r.enabled === 'boolean' ? r.enabled : undefined;
  const sortOrder =
    typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? Math.trunc(r.sortOrder) : undefined;

  let avatarUrl: string | undefined;
  if (r.avatarUrl === null || r.avatarUrl === undefined || r.avatarUrl === '') avatarUrl = undefined;
  else if (typeof r.avatarUrl === 'string') {
    const t = r.avatarUrl.trim();
    avatarUrl = t || undefined;
    if (t.length > 512) throw new Error('invalid_avatar_url');
  } else throw new Error('invalid_avatar_url');

  if (kind === SOURCE_KIND.WEB) {
    const web = r.web;
    if (!web || typeof web !== 'object' || Array.isArray(web)) throw new Error('web_required');
    const w = web as Record<string, unknown>;
    const url = typeof w.url === 'string' ? w.url.trim() : '';
    if (!url) throw new Error('web_url_required');
    const crawlListRaw = w.crawlListUrl;
    const crawlListUrl =
      typeof crawlListRaw === 'string' && crawlListRaw.trim() ? crawlListRaw.trim() : undefined;
    let crawlSelectors: CrawlSelectorsShape | undefined;
    try {
      crawlSelectors = parseCrawlSelectorsForCreate(w);
    } catch {
      throw new Error('invalid_crawl_selectors');
    }
    return {
      kind,
      displayName,
      note,
      enabled,
      sortOrder,
      avatarUrl,
      web: {
        url,
        ...(crawlListUrl ? { crawlListUrl } : {}),
        ...(crawlSelectors ? { crawlSelectors } : {}),
      },
    };
  }

  if (kind === SOURCE_KIND.RSS) {
    const rss = r.rss;
    if (!rss || typeof rss !== 'object' || Array.isArray(rss)) throw new Error('rss_required');
    const s = rss as Record<string, unknown>;
    const feedUrl = typeof s.feedUrl === 'string' ? s.feedUrl.trim() : '';
    if (!feedUrl) throw new Error('rss_feed_required');
    const siteUrl = typeof s.siteUrl === 'string' && s.siteUrl.trim() ? s.siteUrl.trim() : undefined;
    const titleHint = typeof s.titleHint === 'string' && s.titleHint.trim() ? s.titleHint.trim() : undefined;
    if (titleHint && titleHint.length > 200) throw new Error('invalid_title_hint');
    return {
      kind,
      displayName,
      note,
      enabled,
      sortOrder,
      avatarUrl,
      rss: {
        feedUrl,
        ...(siteUrl ? { siteUrl } : {}),
        ...(titleHint ? { titleHint } : {}),
      },
    };
  }

  if (kind === SOURCE_KIND.HOT_API) {
    const hot = r.hot;
    if (!hot || typeof hot !== 'object' || Array.isArray(hot)) throw new Error('hot_required');
    const o = hot as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    if (!url) throw new Error('hot_url_required');
    const mapperRaw = o.mapper;
    let mapper: (Record<string, unknown> & { itemsPath: string }) | null = null;
    if (mapperRaw && typeof mapperRaw === 'object' && !Array.isArray(mapperRaw)) {
      const m = mapperRaw as Record<string, unknown>;
      const itemsPath = typeof m.itemsPath === 'string' ? m.itemsPath.trim() : '';
      if (!itemsPath) throw new Error('invalid_hot_mapper');
      mapper = { ...m, itemsPath };
    }
    return {
      kind,
      displayName,
      note,
      enabled,
      sortOrder,
      avatarUrl,
      hot: {
        url,
        ...(mapper ? { mapper } : {}),
      },
    };
  }

  throw new Error('invalid_kind');
}

/** 将导入行解析为更新载荷（按库中已有 kind 校验） */
export function importRowToUpdateDto(expectedKind: SourceKind, r: Record<string, unknown>): UpdateSourceDto {
  const kind = parseKind(r.kind);
  if (!kind || kind !== expectedKind) throw new Error('kind_mismatch');

  const out: UpdateSourceDto = {};

  if (typeof r.displayName === 'string') {
    const t = r.displayName.trim();
    if (!t || t.length > 200) throw new Error('invalid_display_name');
    out.displayName = t;
  }

  if (r.note !== undefined) {
    if (typeof r.note !== 'string') throw new Error('invalid_note');
    if (r.note.length > 2000) throw new Error('invalid_note');
    out.note = r.note.trim();
  }

  if (typeof r.enabled === 'boolean') out.enabled = r.enabled;

  if (r.sortOrder !== undefined) {
    if (typeof r.sortOrder !== 'number' || !Number.isFinite(r.sortOrder)) throw new Error('invalid_sort_order');
    out.sortOrder = Math.trunc(r.sortOrder);
  }

  if (r.avatarUrl !== undefined) {
    if (r.avatarUrl === null) out.avatarUrl = null;
    else if (typeof r.avatarUrl === 'string') {
      const t = r.avatarUrl.trim();
      if (t.length > 512) throw new Error('invalid_avatar_url');
      out.avatarUrl = t || null;
    } else throw new Error('invalid_avatar_url');
  }

  if (kind === SOURCE_KIND.WEB) {
    const web = r.web;
    if (!web || typeof web !== 'object' || Array.isArray(web)) throw new Error('web_required');
    const w = web as Record<string, unknown>;
    const url = typeof w.url === 'string' ? w.url.trim() : '';
    if (!url) throw new Error('web_url_required');
    const crawlListRaw = w.crawlListUrl;
    const crawlListUrl =
      typeof crawlListRaw === 'string' && crawlListRaw.trim() ? crawlListRaw.trim() : undefined;
    let crawlSelectors:
      | { item: string; link: string; title: string; summary?: string; date?: string }
      | null
      | undefined;
    if ('crawlSelectors' in w) {
      if (w.crawlSelectors === null) crawlSelectors = null;
      else if (w.crawlSelectors && typeof w.crawlSelectors === 'object' && !Array.isArray(w.crawlSelectors)) {
        const o = w.crawlSelectors as Record<string, unknown>;
        const item = typeof o.item === 'string' ? o.item.trim() : '';
        const link = typeof o.link === 'string' ? o.link.trim() : '';
        const title = typeof o.title === 'string' ? o.title.trim() : '';
        if (!item || !link || !title) throw new Error('crawl_selectors_incomplete');
        const summary = typeof o.summary === 'string' ? o.summary.trim() : '';
        const date = typeof o.date === 'string' ? o.date.trim() : '';
        crawlSelectors = {
          item,
          link,
          title,
          ...(summary ? { summary } : {}),
          ...(date ? { date } : {}),
        };
      } else throw new Error('invalid_crawl_selectors');
    }
    out.web = {
      url,
      ...(crawlListUrl !== undefined ? { crawlListUrl } : {}),
      ...(crawlSelectors !== undefined ? { crawlSelectors } : {}),
    };
  } else if (kind === SOURCE_KIND.RSS) {
    const rss = r.rss;
    if (!rss || typeof rss !== 'object' || Array.isArray(rss)) throw new Error('rss_required');
    const s = rss as Record<string, unknown>;
    const feedUrl = typeof s.feedUrl === 'string' ? s.feedUrl.trim() : '';
    if (!feedUrl) throw new Error('rss_feed_required');
    const siteUrl = typeof s.siteUrl === 'string' && s.siteUrl.trim() ? s.siteUrl.trim() : undefined;
    const titleHint = typeof s.titleHint === 'string' && s.titleHint.trim() ? s.titleHint.trim() : undefined;
    if (titleHint && titleHint.length > 200) throw new Error('invalid_title_hint');
    out.rss = {
      feedUrl,
      ...(siteUrl !== undefined ? { siteUrl } : {}),
      ...(titleHint !== undefined ? { titleHint } : {}),
    };
  } else if (kind === SOURCE_KIND.HOT_API) {
    const hot = r.hot;
    if (!hot || typeof hot !== 'object' || Array.isArray(hot)) throw new Error('hot_required');
    const o = hot as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    if (!url) throw new Error('hot_url_required');
    const mapperRaw = o.mapper;
    let mapper: (Record<string, unknown> & { itemsPath: string }) | null = null;
    if (mapperRaw && typeof mapperRaw === 'object' && !Array.isArray(mapperRaw)) {
      const m = mapperRaw as Record<string, unknown>;
      const itemsPath = typeof m.itemsPath === 'string' ? m.itemsPath.trim() : '';
      if (!itemsPath) throw new Error('invalid_hot_mapper');
      mapper = { ...m, itemsPath };
    }
    out.hot = {
      url,
      ...(mapper ? { mapper } : {}),
    };
  } else {
    throw new Error('invalid_kind');
  }

  return out;
}
