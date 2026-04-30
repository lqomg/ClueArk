import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';
import { FeedClusterService } from './feed-cluster.service';

/**
 * 进程启动后异步跑一轮富化 + 聚类（不阻塞 listen）。
 * FEED_BOOTSTRAP_ENRICH_CLUSTER=true 时启用。
 */
@Injectable()
export class FeedBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeedBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly enrich: FeedLlmEnrichService,
    private readonly cluster: FeedClusterService,
  ) {}

  onApplicationBootstrap() {
    const on = this.config.get<string>('FEED_BOOTSTRAP_ENRICH_CLUSTER')?.trim() === 'true';
    if (!on) return;

    void this.runOnce().catch((e) =>
      this.logger.error(`启动富化/聚类失败: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  private async runOnce() {
    const raw = Number(this.config.get('FEED_BOOTSTRAP_ENRICH_LIMIT'));
    const limit = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;

    this.logger.log(`启动任务：LLM 富化最多 ${limit} 条，随后相似聚类`);
    const r = await this.enrich.processPending(limit);
    if (!r.skipped && r.processed > 0) {
      this.logger.log(`启动 LLM 富化：${r.processed} 条，成功 ${r.ok}，失败 ${r.failed}`);
    }
    await this.cluster.run();
    this.logger.log('启动相似聚类已执行');
  }
}
