import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CluearkBackendClient } from './clueark-backend.client';
import { CrawlService } from './crawl.service';
import type { CrawlRunDto } from './dto/crawl-run.dto';

@Injectable()
export class CrawlPollTask implements OnApplicationBootstrap {
  private readonly logger = new Logger(CrawlPollTask.name);

  constructor(
    private readonly config: ConfigService,
    private readonly backend: CluearkBackendClient,
    private readonly crawlService: CrawlService,
  ) {}

  private maxItems(): number {
    const raw = Number(this.config.get('CRAWLER_MAX_ITEMS'));
    return Number.isFinite(raw) && raw >= 1 && raw <= 200 ? Math.floor(raw) : 50;
  }

  /** 启动完成后异步跑一轮，不阻塞 HTTP listen */
  onApplicationBootstrap(): void {
    if (this.config.get('CRAWLER_POLL_DISABLED') === 'true') {
      return;
    }
    void this.runPollRound('startup').catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`启动首轮爬取异常: ${msg}`);
    });
  }

  /** 每 15 分钟整点执行（与主站 RSS 轮询节奏一致） */
  @Cron('0 */15 * * * *')
  async handleCron(): Promise<void> {
    await this.runPollRound('cron');
  }

  private async runPollRound(trigger: string): Promise<void> {
    if (this.config.get('CRAWLER_POLL_DISABLED') === 'true') {
      return;
    }

    try {
      const sources = await this.backend.fetchCrawlSources();
      if (sources.length === 0) {
        this.logger.debug(`[${trigger}] 本轮无 Web 信源需爬取`);
        return;
      }

      const maxItems = this.maxItems();
      this.logger.log(`[${trigger}] Web 爬虫：信源 ${sources.length} 个，每源最多 ${maxItems} 条`);

      for (let i = 0; i < sources.length; i++) {
        const row = sources[i];
        try {
          const dto = {
            sourceId: row.sourceId,
            listUrl: row.listUrl,
            maxItems,
            ...(row.selectors ? { selectors: row.selectors } : {}),
          } as CrawlRunDto;
          this.logger.log(`[${trigger}] 拉取 ${row.sourceId}：${row.listUrl}`);
          const result = await this.crawlService.runJob(dto);
          await this.backend.postCrawlIngest(result);
          this.logger.log(
            `[${trigger}] 已上报 ${row.sourceId}：items=${result.items.length}${result.errors?.length ? ` errors=${result.errors.length}` : ''}`,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`[${trigger}] 信源 ${row.sourceId} 爬取或上报失败: ${msg}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`[${trigger}] Web 爬虫轮询失败: ${msg}`);
    }
  }
}
