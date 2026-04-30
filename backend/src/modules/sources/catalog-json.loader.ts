import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SOURCE_KIND, type CatalogJsonSourceKind, parseCatalogJsonKind } from './source-kind';

export type { CatalogJsonSourceKind };

export interface CatalogJsonRow {
  id: string;
  name: string;
  description: string;
  /** 默认 web：站点首页；rss 表示订阅地址见 feedUrl；hot_api 见 baseUrl/platformIds */
  kind?: CatalogJsonSourceKind;
  /** kind=web（或未写 kind）时必填：站点首页 */
  url?: string;
  /** kind=rss 时必填：RSS/Atom Feed URL */
  feedUrl?: string;
  /** kind=rss 时可选：站点首页，便于跳转 */
  siteUrl?: string;
  /** kind=hot_api 时必填：热点 API URL（返回 JSON） */
  hotUrl?: string;
  /** kind=hot_api 时可选：声明式映射（对象） */
  mapper?: unknown;
}

export interface CatalogJsonFile {
  sources: CatalogJsonRow[];
}

const SEED_KEY_RE = /^[a-zA-Z0-9_-]+$/;

function defaultCatalogPath(): string {
  const fromEnv = process.env.BUILTIN_CATALOG_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(__dirname, '..', '..', '..', '..', 'data', 'built-in-catalog.json');
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function loadCatalogJsonFromDisk(path = defaultCatalogPath()): CatalogJsonFile {
  if (!existsSync(path)) {
    throw new Error(
      `[ClueArk] 未找到信源种子文件: ${path}。请将 data/built-in-catalog.json 置于项目根目录，或设置 BUILTIN_CATALOG_PATH。`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error(`[ClueArk] 信源种子 JSON 无法解析: ${path}`);
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error('[ClueArk] catalog-json: 根节点须为对象');
  }
  const obj = raw as Record<string, unknown>;
  const sources = obj.sources;
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('[ClueArk] catalog-json: sources 须为非空数组');
  }
  const seen = new Set<string>();
  const out: CatalogJsonRow[] = [];
  for (let i = 0; i < sources.length; i++) {
    const row = sources[i];
    if (!row || typeof row !== 'object') throw new Error(`[ClueArk] catalog-json: sources[${i}] 须为对象`);
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const description = typeof r.description === 'string' ? r.description.trim() : '';
    const kindRaw = typeof r.kind === 'string' ? r.kind.trim().toLowerCase() : '';
    const kind = parseCatalogJsonKind(kindRaw);
    const url = typeof r.url === 'string' ? r.url.trim() : '';
    const feedUrl = typeof r.feedUrl === 'string' ? r.feedUrl.trim() : '';
    const siteUrl = typeof r.siteUrl === 'string' ? r.siteUrl.trim() : '';
    if (!id || !SEED_KEY_RE.test(id)) throw new Error(`[ClueArk] catalog-json: 非法 id: ${id}`);
    if (seen.has(id)) throw new Error(`[ClueArk] catalog-json: 重复 id: ${id}`);
    seen.add(id);
    if (!name || name.length > 200) throw new Error(`[ClueArk] catalog-json: name 无效 @ ${id}`);
    if (!description || description.length > 2000) throw new Error(`[ClueArk] catalog-json: description 无效 @ ${id}`);
    if (kind === SOURCE_KIND.WEB) {
      if (!url || !isHttpUrl(url) || url.length > 2048) throw new Error(`[ClueArk] catalog-json: url 无效 @ ${id}`);
      out.push({ id, name, description, kind: SOURCE_KIND.WEB, url });
    } else if (kind === SOURCE_KIND.HOT_API) {
      const hotUrl = typeof r.hotUrl === 'string' ? r.hotUrl.trim() : '';
      if (!hotUrl || !isHttpUrl(hotUrl) || hotUrl.length > 2048) {
        throw new Error(`[ClueArk] catalog-json: hot_api hotUrl 无效 @ ${id}`);
      }
      const mapperRaw = r.mapper;
      const mapper =
        mapperRaw && typeof mapperRaw === 'object' && !Array.isArray(mapperRaw) ? (mapperRaw as Record<string, unknown>) : null;
      out.push({
        id,
        name,
        description,
        kind: SOURCE_KIND.HOT_API,
        hotUrl,
        ...(mapper ? { mapper } : {}),
      });
    } else {
      if (!feedUrl || !isHttpUrl(feedUrl) || feedUrl.length > 2048) {
        throw new Error(`[ClueArk] catalog-json: rss feedUrl 无效 @ ${id}`);
      }
      if (siteUrl && (!isHttpUrl(siteUrl) || siteUrl.length > 2048)) {
        throw new Error(`[ClueArk] catalog-json: rss siteUrl 无效 @ ${id}`);
      }
      out.push({
        id,
        name,
        description,
        kind: SOURCE_KIND.RSS,
        feedUrl,
        ...(siteUrl ? { siteUrl } : {}),
      });
    }
  }
  return { sources: out };
}

@Injectable()
export class CatalogJsonLoader {
  readonly data: CatalogJsonFile;

  constructor() {
    this.data = loadCatalogJsonFromDisk();
  }
}
