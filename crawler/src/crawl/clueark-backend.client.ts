import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CrawlResult } from './crawl.types';

export type CrawlSourceRow = {
  sourceId: string;
  listUrl: string;
  pollIntervalSec?: number;
  nextPollAt?: string | null;
  selectors?: { item: string; link: string; title: string; summary?: string; date?: string };
};

const FETCH_TIMEOUT_MS = 25_000;

function unwrapApiData(json: unknown): unknown {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: unknown }).data;
  }
  return json;
}

@Injectable()
export class CluearkBackendClient {
  private readonly logger = new Logger(CluearkBackendClient.name);

  constructor(private readonly config: ConfigService) {}

  private requireBackendBase(): string {
    const raw = this.config.get<string>('CLUEARK_BACKEND_URL')?.trim();
    if (!raw) {
      throw new Error('CLUEARK_BACKEND_URL 未配置');
    }
    return raw.replace(/\/+$/, '');
  }

  private requireIngestSecret(): string {
    const s = this.config.get<string>('CRAWLER_INGEST_SECRET')?.trim();
    if (!s) {
      throw new Error('CRAWLER_INGEST_SECRET 未配置');
    }
    return s;
  }

  private authHeaders(): Record<string, string> {
    const secret = this.requireIngestSecret();
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    };
  }

  async fetchCrawlSources(): Promise<CrawlSourceRow[]> {
    const base = this.requireBackendBase();
    const url = `${base}/api/internal/feed-items/crawl-sources`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.authHeaders(),
        signal: controller.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`GET crawl-sources HTTP ${res.status} ${t.slice(0, 200)}`);
      }
      const json: unknown = await res.json();
      const data = unwrapApiData(json) as { sources?: CrawlSourceRow[] };
      const sources = data?.sources;
      if (!Array.isArray(sources)) {
        this.logger.warn('crawl-sources 响应缺少 sources 数组');
        return [];
      }
      return sources.filter((r) => r && typeof r.sourceId === 'string' && typeof r.listUrl === 'string');
    } finally {
      clearTimeout(timer);
    }
  }

  async postCrawlIngest(payload: CrawlResult): Promise<void> {
    const base = this.requireBackendBase();
    const url = `${base}/api/internal/feed-items/crawl-ingest`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`POST crawl-ingest HTTP ${res.status} ${t.slice(0, 400)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
