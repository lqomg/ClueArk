import { createHash } from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { formatJobError } from '../job-center/job-log.util';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
/** rss-parser 为 CJS `export =`，default import 在未开 esModuleInterop 时会错解为 `.default` */
import Parser = require('rss-parser');
import { SOURCE_KIND } from '../sources/source-kind';
import { Source, SourceDocument, type HotApiMapper } from '../sources/schemas/source.schema';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import { FeedItemLlmService } from './feed-item-llm.service';
import { fingerprintUrlKey } from '../sources/fingerprint.util';
import type { CrawlerIngestBodyDto } from './dto/crawler-ingest.dto';
import { applyRssPublishedAtFeedCorrection } from './rss-published-at-corrections';
import {
  normalizeSummaryForStore,
} from './feed-llm.constants';
import {
  capFuturePublishedAt,
  coalescePublishedAtOrFallback,
  maxAllowedPublishedAt,
  normalizePublishedAt,
} from './published-at.util';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS_PER_FEED = 200;

/** 部分站点对非浏览器 UA 返回 HTML，导致 rss-parser 解析失败 */
const RSS_FETCH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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

function resolveItemLink(feedBase: string, rawLink?: string): string | null {
  const t = rawLink?.trim();
  if (!t) return null;
  try {
    return new URL(t, feedBase).toString();
  } catch {
    return null;
  }
}

function guidString(guid: unknown): string {
  if (typeof guid === 'string') return guid.trim();
  if (guid && typeof guid === 'object' && 'value' in guid && typeof (guid as { value: unknown }).value === 'string') {
    return String((guid as { value: string }).value).trim();
  }
  return '';
}

function itemKeyFromEntry(feedBase: string, linkRaw: string | undefined, guidRaw: string): string | null {
  const abs = resolveItemLink(feedBase, linkRaw);
  if (abs) {
    const norm = fingerprintUrlKey(abs) ?? abs;
    return createHash('sha256').update(norm, 'utf8').digest('hex');
  }
  if (guidRaw) {
    return createHash('sha256').update(`guid:${guidRaw}`, 'utf8').digest('hex');
  }
  return null;
}

async function fetchRssXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': RSS_FETCH_USER_AGENT,
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export type CrawlIngestSummary = {
  sourceId: string;
  crawlRunId: string;
  upserted: number;
  itemsProcessed: number;
  itemsSkipped: number;
  durationMs: number;
};

type HotApiItem = {
  id?: string | number;
  title?: string;
  url?: string;
  pubDate?: number | string;
  summary?: string;
};

type HotApiMapperConfig = HotApiMapper;

type PathStep = { kind: 'prop'; key: string } | { kind: 'idx'; index: number };
type CompiledPath = { raw: string; steps: PathStep[] };

const PATH_RE = /^\$?(\.[A-Za-z0-9_-]+|\[[0-9]+\])*$/;
const compiledPathCache = new Map<string, CompiledPath>();

function compilePath(raw: string): CompiledPath | null {
  const t = raw.trim();
  if (!t) return null;
  if (!PATH_RE.test(t)) return null;
  const cached = compiledPathCache.get(t);
  if (cached) return cached;

  const steps: PathStep[] = [];
  let i = 0;
  if (t[i] === '$') i += 1;
  while (i < t.length) {
    const ch = t[i];
    if (ch === '.') {
      i += 1;
      let j = i;
      while (j < t.length) {
        const c = t[j];
        if (!c) break;
        const code = c.charCodeAt(0);
        const ok =
          (code >= 48 && code <= 57) || // 0-9
          (code >= 65 && code <= 90) || // A-Z
          (code >= 97 && code <= 122) || // a-z
          c === '_' ||
          c === '-';
        if (!ok) break;
        j += 1;
      }
      const key = t.slice(i, j);
      if (!key) return null;
      steps.push({ kind: 'prop', key });
      i = j;
      continue;
    }
    if (ch === '[') {
      i += 1;
      let j = i;
      while (j < t.length) {
        const c = t[j];
        if (!c) break;
        const code = c.charCodeAt(0);
        if (code < 48 || code > 57) break;
        j += 1;
      }
      if (t[j] !== ']') return null;
      const n = Number(t.slice(i, j));
      if (!Number.isFinite(n) || n < 0) return null;
      steps.push({ kind: 'idx', index: n });
      i = j + 1;
      continue;
    }
    return null;
  }

  const compiled: CompiledPath = { raw: t, steps };
  // 控制缓存规模，避免长期运行无界增长
  if (compiledPathCache.size > 400) compiledPathCache.clear();
  compiledPathCache.set(t, compiled);
  return compiled;
}

function getByCompiledPath(root: unknown, compiled: CompiledPath): unknown {
  let cur: unknown = root;
  for (let i = 0; i < compiled.steps.length; i++) {
    const s = compiled.steps[i]!;
    if (s.kind === 'prop') {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[s.key];
      continue;
    }
    // idx
    if (!Array.isArray(cur)) return undefined;
    cur = cur[s.index];
  }
  return cur;
}

function getByPath(root: unknown, path: string): unknown {
  const compiled = compilePath(path);
  if (!compiled) return undefined;
  return getByCompiledPath(root, compiled);
}

function stringifyTrimmed(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return '';
}

@Injectable()
export class FeedIngestService {
  private readonly logger = new Logger(FeedIngestService.name);
  private readonly parser: Parser;

  constructor(
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    private readonly scheduler: JobSchedulerService,
    private readonly feedItemLlmService: FeedItemLlmService,
  ) {
    this.parser = new Parser({
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 5,
    });
  }

  private async sourceDisplayName(sourceId: Types.ObjectId): Promise<string> {
    const row = await this.sourceModel.findById(sourceId).select({ displayName: 1 }).lean().exec();
    return row?.displayName?.trim() || String(sourceId);
  }

  private logIngestFailure(
    channel: 'RSS' | 'HotAPI' | 'Web',
    sourceId: Types.ObjectId,
    label: string,
    targetUrl: string,
    err: unknown,
  ): void {
    const detail = formatJobError(err, FETCH_TIMEOUT_MS);
    this.logger.warn(
      `${channel} 拉取失败 [${label}] ${targetUrl}: ${detail} sourceId=${String(sourceId)}`,
    );
  }

  /** 返回本次 bulkWrite 中 upsert 的新文档数近似（matched+upsert）；此处统计 modified + upserted */
  async ingestOneSource(sourceId: Types.ObjectId, feedUrl: string): Promise<number> {
    const label = await this.sourceDisplayName(sourceId);
    try {
      return await this.ingestOneSourceInner(sourceId, feedUrl);
    } catch (e) {
      this.logIngestFailure('RSS', sourceId, label, feedUrl, e);
      throw e;
    }
  }

  private async ingestOneSourceInner(sourceId: Types.ObjectId, feedUrl: string): Promise<number> {
    const xml = await fetchRssXml(feedUrl);
    const feed = await this.parser.parseString(xml);
    const feedBase = feed.link?.trim() || feed.feedUrl?.trim() || feedUrl;
    const now = new Date();

    const ops: {
      updateOne: {
        filter: { sourceId: Types.ObjectId; itemKey: string };
        update: { $setOnInsert: Record<string, unknown> };
        upsert: boolean;
      };
    }[] = [];
    const items = (feed.items ?? []).slice(0, MAX_ITEMS_PER_FEED);

    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      const guid = guidString(it.guid);
      const linkResolved = resolveItemLink(feedBase, it.link) ?? resolveItemLink(feedUrl, it.link);
      const itemKey = itemKeyFromEntry(feedBase, it.link, guid);
      if (!itemKey || !linkResolved) continue;

      const titleRaw = stripTags((it.title ?? '').trim()) || '（无标题）';
      const title = truncate(titleRaw, 500);
      const snippet = stripTags((it.contentSnippet ?? it.summary ?? it.content ?? '').trim());
      const summary = normalizeSummaryForStore(snippet);

      const publishedAtRaw = it.isoDate ?? it.pubDate ?? null;
      const publishedAt = coalescePublishedAtOrFallback(
        capFuturePublishedAt(applyRssPublishedAtFeedCorrection(feedUrl, normalizePublishedAt(publishedAtRaw, { now })), now),
        now,
      );

      ops.push({
        updateOne: {
          filter: { sourceId, itemKey },
          update: {
            $setOnInsert: {
              sourceId,
              itemKey,
              link: truncate(linkResolved, 2048),
              title,
              summary,
              publishedAt,
              guid: truncate(guid, 512),
            },
          },
          upsert: true,
        },
      });
    }

    if (!ops.length) return 0;
    const res = await this.feedItemModel.bulkWrite(ops, { ordered: false });
    await this.repairFuturePublishedAtForSource(sourceId, now);
    await this.enqueueUpsertedItems(sourceId, res);
    return res.upsertedCount ?? 0;
  }

  private async enqueueUpsertedItems(
    sourceId: Types.ObjectId,
    res: { upsertedIds?: Record<number, Types.ObjectId> },
    forceLlmSkipped = false,
  ): Promise<void> {
    const upserted = res.upsertedIds;
    if (!upserted) return;
    const ids = Object.keys(upserted).map((key) => upserted[key as unknown as number]);
    if (ids.length) {
      await this.feedItemLlmService.ensureInitialForNewItems(ids, forceLlmSkipped);
    }

    const src = await this.sourceModel.findById(sourceId).select({ monitoredByCount: 1 }).lean().exec();
    if (!src?.monitoredByCount) return;
    const sid = String(sourceId);
    for (const id of ids) {
      await this.scheduler.enqueueProcessNewItem(String(id), sid, { trigger: 'pipeline' });
    }
    if (ids.length) {
      this.logger.debug(
        `event=ingest_pipeline_enqueued sourceId=${sid} count=${ids.length} monitoredByCount=${src.monitoredByCount}`,
      );
    }
  }

  /**
   * 供爬虫拉取：已启用的 Web 信源。listUrl = crawlListUrl ?? url；selectors 三者齐全时下发。
   * ingest 时 feedBase 仍仅用 web.url（见 ingestCrawlerBatch）。
   */
  async listWebSourcesForCrawler(): Promise<
    {
      sourceId: string;
      listUrl: string;
      nextPollAt?: string | null;
      selectors?: { item: string; link: string; title: string; summary?: string; date?: string };
    }[]
  > {
    const rows = await this.sourceModel
      .find({
        kind: SOURCE_KIND.WEB,
        enabled: true,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        'web.url': { $exists: true, $ne: '' },
      })
      .select({ _id: 1, web: 1, nextPollAt: 1 })
      .lean()
      .exec();

    const out: {
      sourceId: string;
      listUrl: string;
      nextPollAt?: string | null;
      selectors?: { item: string; link: string; title: string; summary?: string; date?: string };
    }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as unknown as {
        _id: Types.ObjectId;
        nextPollAt?: Date | null;
        web?: { url?: string; crawlListUrl?: string; crawlSelectors?: { item?: string; link?: string; title?: string; summary?: string; date?: string } };
      };
      const w = r.web;
      const baseUrl = w?.url?.trim();
      if (!baseUrl) continue;
      const listUrl = (w?.crawlListUrl?.trim() || baseUrl).trim();
      if (!listUrl) continue;
      const cs = w?.crawlSelectors;
      const entry: (typeof out)[0] = {
        sourceId: r._id.toHexString(),
        listUrl,
        nextPollAt: r.nextPollAt ? new Date(r.nextPollAt).toISOString() : null,
      };
      if (cs?.item?.trim() && cs?.link?.trim() && cs?.title?.trim()) {
        entry.selectors = {
          item: cs.item.trim(),
          link: cs.link.trim(),
          title: cs.title.trim(),
          ...(cs.summary?.trim() ? { summary: cs.summary.trim() } : {}),
          ...(cs.date?.trim() ? { date: cs.date.trim() } : {}),
        };
      }
      out.push(entry);
    }
    return out;
  }

  async ingestCrawlerBatch(dto: CrawlerIngestBodyDto): Promise<CrawlIngestSummary> {
    const started = Date.now();
    const now = new Date();
    const sourceId = new Types.ObjectId(dto.sourceId);
    const source = await this.sourceModel
      .findOne({
        _id: sourceId,
        enabled: true,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .lean()
      .exec();

    if (!source) {
      throw new NotFoundException('source_not_found_or_disabled');
    }
    if (source.kind !== SOURCE_KIND.WEB) {
      throw new BadRequestException('source_must_be_web_kind');
    }
    const webUrl = source.web?.url?.trim();
    if (!webUrl) {
      throw new BadRequestException('source_web_url_missing');
    }

    const feedBase = webUrl;
    const ops: {
      updateOne: {
        filter: { sourceId: Types.ObjectId; itemKey: string };
        update: { $setOnInsert: Record<string, unknown> };
        upsert: boolean;
      };
    }[] = [];
    let itemsSkipped = 0;
    const slice = dto.items.slice(0, MAX_ITEMS_PER_FEED);

    for (let i = 0; i < slice.length; i++) {
      const it = slice[i];
      const guid = (it.guid ?? '').trim();
      const linkResolved =
        resolveItemLink(feedBase, it.link) ??
        (() => {
          try {
            return new URL(it.link.trim()).toString();
          } catch {
            return null;
          }
        })();
      const itemKey = itemKeyFromEntry(feedBase, it.link, guid);
      if (!itemKey || !linkResolved) {
        itemsSkipped += 1;
        continue;
      }

      const titleRaw = stripTags(it.title.trim()) || '（无标题）';
      const title = truncate(titleRaw, 500);
      const snippet = stripTags((it.summary ?? '').trim());
      const summary = normalizeSummaryForStore(snippet);

      const publishedAt = coalescePublishedAtOrFallback(
        capFuturePublishedAt(normalizePublishedAt(it.publishedAt, { now }), now),
        now,
      );

      ops.push({
        updateOne: {
          filter: { sourceId, itemKey },
          update: {
            $setOnInsert: {
              sourceId,
              itemKey,
              link: truncate(linkResolved, 2048),
              title,
              summary,
              publishedAt,
              guid: truncate(guid, 512),
            },
          },
          upsert: true,
        },
      });
    }

    let upserted = 0;
    if (ops.length) {
      const res = await this.feedItemModel.bulkWrite(ops, { ordered: false });
      upserted = res.upsertedCount ?? 0;
      await this.repairFuturePublishedAtForSource(sourceId, now);
      await this.enqueueUpsertedItems(sourceId, res);
    }

    const durationMs = Date.now() - started;
    this.logger.debug(
      `爬虫 ingest：source=${dto.sourceId} run=${dto.crawlRunId} upsert 新建≈${upserted} 条操作，处理 ${ops.length} 条，跳过 ${itemsSkipped}，${durationMs}ms`,
    );

    return {
      sourceId: dto.sourceId,
      crawlRunId: dto.crawlRunId,
      upserted,
      itemsProcessed: ops.length,
      itemsSkipped,
      durationMs,
    };
  }

  /** 单信源热点 API 轮询（source_poll 任务调用） */
  async pollHotApiSourceById(sourceId: string): Promise<number> {
    const oid = new Types.ObjectId(sourceId);
    const row = await this.sourceModel
      .findOne({
        _id: oid,
        kind: SOURCE_KIND.HOT_API,
        enabled: true,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        'hot.url': { $exists: true, $ne: '' },
      })
      .select({ _id: 1, hot: 1, displayName: 1 })
      .lean()
      .exec();
    if (!row?.hot?.url?.trim()) return 0;
    const url = row.hot.url.trim();
    const label = row.displayName?.trim() || sourceId;
    try {
      const mapper =
        row.hot.mapper && typeof row.hot.mapper === 'object' && !Array.isArray(row.hot.mapper)
          ? row.hot.mapper
          : null;
      const feedBase = this.hotFeedBase(url);
      const items = await this.fetchHotApi(url, mapper);
      const upserted = await this.ingestHotApiItems(oid, feedBase, items);
      await this.sourceModel.updateOne({ _id: row._id }, { $set: { 'hot.lastPollAt': new Date() } }).exec();
      return upserted;
    } catch (e) {
      this.logIngestFailure('HotAPI', oid, label, url, e);
      throw e;
    }
  }

  /** 管理员手动同步：为全部已启用 RSS / Hot API 信源入队 source_poll */
  async enqueueManualSourcePolls(): Promise<{ enqueued: number; skipped: number }> {
    const rows = await this.sourceModel
      .find({
        enabled: true,
        kind: { $in: [SOURCE_KIND.RSS, SOURCE_KIND.HOT_API] },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .select({ _id: 1, kind: 1, rss: 1 })
      .lean()
      .exec();
    let enqueued = 0;
    let skipped = 0;
    for (const row of rows) {
      const sourceId = String(row._id);
      if (row.kind === SOURCE_KIND.RSS && row.rss?.feedUrl) {
        const res = await this.scheduler.enqueue({
          type: 'source_poll',
          payload: { sourceId, kind: 'rss', feedUrl: row.rss.feedUrl },
          trigger: 'manual',
        });
        if (res.skipped) skipped++;
        else enqueued++;
      } else if (row.kind === SOURCE_KIND.HOT_API) {
        const res = await this.scheduler.enqueue({
          type: 'source_poll',
          payload: { sourceId, kind: 'hot_api' },
          trigger: 'manual',
        });
        if (res.skipped) skipped++;
        else enqueued++;
      }
    }
    return { enqueued, skipped };
  }

  private hotFeedBase(hotUrl: string): string {
    try {
      const u = new URL(hotUrl);
      return u.origin;
    } catch {
      return hotUrl;
    }
  }

  private mapHotApiJson(json: unknown, mapper: HotApiMapperConfig): HotApiItem[] {
    const itemsPath = (typeof mapper.itemsPath === 'string' && mapper.itemsPath.trim()) ? mapper.itemsPath.trim() : '$.items';
    const titlePath = (typeof mapper.titlePath === 'string' && mapper.titlePath.trim()) ? mapper.titlePath.trim() : '$.title';
    const urlPath = (typeof mapper.urlPath === 'string' && mapper.urlPath.trim()) ? mapper.urlPath.trim() : '$.url';
    const idPath = (typeof mapper.idPath === 'string' && mapper.idPath.trim()) ? mapper.idPath.trim() : '$.id';
    const pubDatePath = (typeof mapper.pubDatePath === 'string' && mapper.pubDatePath.trim()) ? mapper.pubDatePath.trim() : '$.pubDate';
    const summaryPath = (typeof mapper.summaryPath === 'string' && mapper.summaryPath.trim()) ? mapper.summaryPath.trim() : '$.summary';

    const arr = getByPath(json, itemsPath);
    if (!Array.isArray(arr)) return [];
    const out: HotApiItem[] = [];

    for (let i = 0; i < arr.length && out.length < MAX_ITEMS_PER_FEED; i++) {
      const it = arr[i];
      if (!it || typeof it !== 'object') continue;
      const title = stringifyTrimmed(getByPath(it, titlePath));
      const url = stringifyTrimmed(getByPath(it, urlPath));
      if (!title || !url) continue;
      const idRaw = getByPath(it, idPath);
      const pubRaw = getByPath(it, pubDatePath);
      const summaryRaw = getByPath(it, summaryPath);
      const summary = stringifyTrimmed(summaryRaw);
      out.push({
        title,
        url,
        ...(idRaw !== undefined && idRaw !== null && String(idRaw) !== '' ? { id: idRaw as string | number } : {}),
        ...(pubRaw !== undefined ? { pubDate: pubRaw as number | string } : {}),
        ...(summary ? { summary } : {}),
      });
    }
    return out;
  }

  private coerceHotItems(out: unknown): HotApiItem[] {
    const items =
      Array.isArray(out)
        ? out
        : out && typeof out === 'object' && Array.isArray((out as { items?: unknown }).items)
          ? (out as { items: unknown[] }).items
          : [];
    if (!Array.isArray(items)) return [];
    const res: HotApiItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || typeof it !== 'object') continue;
      const r = it as Record<string, unknown>;
      const title = typeof r.title === 'string' ? r.title.trim() : '';
      const url = typeof r.url === 'string' ? r.url.trim() : '';
      if (!title || !url) continue;
      const summary = typeof r.summary === 'string' ? r.summary : '';
      res.push({
        title,
        url,
        ...(r.id !== undefined && r.id !== null && String(r.id) !== '' ? { id: r.id as string | number } : {}),
        ...(r.pubDate !== undefined ? { pubDate: r.pubDate as number | string } : {}),
        ...(summary.trim() ? { summary } : {}),
      });
    }
    return res;
  }

  private async fetchHotApi(hotUrl: string, mapper: HotApiMapperConfig | null): Promise<HotApiItem[]> {
    const url = hotUrl.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          accept: 'application/json',
          'user-agent': RSS_FETCH_USER_AGENT,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      if (!mapper) return this.coerceHotItems(json);
      return this.coerceHotItems(this.mapHotApiJson(json, mapper));
    } finally {
      clearTimeout(timer);
    }
  }

  private async ingestHotApiItems(
    sourceId: Types.ObjectId,
    feedBase: string,
    items: HotApiItem[],
  ): Promise<number> {
    const now = new Date();
    const ops: {
      updateOne: {
        filter: { sourceId: Types.ObjectId; itemKey: string };
        update: { $setOnInsert: Record<string, unknown> };
        upsert: boolean;
      };
    }[] = [];

    const slice = items.slice(0, MAX_ITEMS_PER_FEED);
    for (let i = 0; i < slice.length; i++) {
      const it = slice[i]!;
      const guid =
        it.id !== undefined && it.id !== null && String(it.id) !== '' ? `hot:${sourceId.toString()}:${String(it.id)}` : '';
      const linkResolved =
        resolveItemLink(feedBase, it.url) ??
        (() => {
          try {
            return new URL(it.url.trim()).toString();
          } catch {
            return null;
          }
        })();
      const itemKey = itemKeyFromEntry(feedBase, it.url, guid);
      if (!itemKey || !linkResolved) continue;

      const titleRaw = stripTags((it.title ?? '').trim()) || '（无标题）';
      const title = truncate(titleRaw, 500);
      const summaryRaw = stripTags((it.summary ?? '').trim());
      const summary = summaryRaw ? normalizeSummaryForStore(summaryRaw) : '';
      const publishedAt = coalescePublishedAtOrFallback(
        capFuturePublishedAt(normalizePublishedAt(it.pubDate, { now }), now),
        now,
      );

      ops.push({
        updateOne: {
          filter: { sourceId, itemKey },
          update: {
            $setOnInsert: {
              sourceId,
              itemKey,
              link: truncate(linkResolved, 2048),
              title,
              summary,
              publishedAt,
              guid: truncate(guid, 512),
            },
          },
          upsert: true,
        },
      });
    }

    if (!ops.length) return 0;
    const res = await this.feedItemModel.bulkWrite(ops, { ordered: false });
    await this.repairFuturePublishedAtForSource(sourceId, now);
    await this.enqueueUpsertedItems(sourceId, res, true);
    return res.upsertedCount ?? 0;
  }

  private async repairFuturePublishedAtForSource(sourceId: Types.ObjectId, now: Date): Promise<void> {
    await this.feedItemModel
      .updateMany(
        { sourceId, publishedAt: { $gt: maxAllowedPublishedAt(now) } },
        [{ $set: { publishedAt: now } }],
      )
      .exec();
  }
}
