import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CrawlResult, SelectorProfile } from './crawl.types';
import { CrawlRunDto } from './dto/crawl-run.dto';
import { defaultSelectorProfile, extractListEntries } from './extract-list';
import { fetchHtml } from './fetch-html';

@Injectable()
export class CrawlService {
  private readonly logger = new Logger(CrawlService.name);
  async runJob(dto: CrawlRunDto): Promise<CrawlResult> {
    const maxItems = dto.maxItems ?? 50;
    const profile: SelectorProfile = dto.selectors ? { ...dto.selectors } : defaultSelectorProfile;
    const errors: string[] = [];

    let html: string;
    try {
      this.logger.log(`拉取 ${dto.sourceId}：${dto.listUrl}`);
      html = await fetchHtml(dto.listUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`拉取列表页失败: ${msg}`);
      return {
        sourceId: dto.sourceId,
        crawlRunId: randomUUID(),
        crawledAt: new Date().toISOString(),
        items: [],
        errors,
      };
    }
    const { items, errors: parseErrors } = extractListEntries(dto.listUrl, html, profile, maxItems);
    errors.push(...parseErrors);

    const result: CrawlResult = {
      sourceId: dto.sourceId,
      crawlRunId: randomUUID(),
      crawledAt: new Date().toISOString(),
      items,
    };
    if (errors.length) result.errors = errors;
    return result;
  }
}
