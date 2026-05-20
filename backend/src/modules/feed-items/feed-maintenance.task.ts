import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';
import { FeedClusterService } from './feed-cluster.service';
import { AggregationPolicyService } from '../aggregation-policy/aggregation-policy.service';

/**
 * 定时维护：LLM 富化（每 5 小时）与相似聚类（每 10 分钟），原拆分的两个 Cron 合并于此。
 */
@Injectable()
export class FeedMaintenanceTask {
  private readonly logger = new Logger(FeedMaintenanceTask.name);

  constructor(
    private readonly config: ConfigService,
    private readonly enrich: FeedLlmEnrichService,
    private readonly cluster: FeedClusterService,
    private readonly aggregationPolicy: AggregationPolicyService,
  ) {}

  /** 每 5 小时处理一批 pending（0:00、5:00、10:00…，与 RSS 轮询互补） */
  @Cron('0 0 */5 * * *')
  async handleLlmCron() {
    const raw = Number(this.config.get('FEED_LLM_POLL_LIMIT'));
    const limit = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;
    try {
      const r = await this.enrich.processPending(limit);
      if (!r.skipped && r.processed > 0) {
        this.logger.log(`LLM 定时富化：${r.processed} 条，成功 ${r.ok}，失败 ${r.failed}`);
      }
    } catch (e) {
      this.logger.error(`LLM 定时富化异常: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** 每 10 分钟跑相似聚类（embedding + 双阈值） */
  @Cron('0 */10 * * * *')
  async handleClusterCron() {
    const p = await this.aggregationPolicy.getResolvedClusterParams();
    if (p.clusterCronDisabled) return;
    try {
      await this.cluster.run();
    } catch (e) {
      this.logger.error(`相似聚类失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
