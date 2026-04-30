import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { FeedIngestService } from './feed-ingest.service';

@Injectable()
export class FeedPollTask implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeedPollTask.name);

  constructor(
    private readonly config: ConfigService,
    private readonly feedIngest: FeedIngestService,
  ) {}

  /** 启动完成后异步拉一轮 RSS + 热点，不阻塞 HTTP listen */
  onApplicationBootstrap(): void {
    if (this.config.get('FEED_RSS_POLL_STARTUP_DISABLED') === 'true' && this.config.get('FEED_NEWSONW_POLL_STARTUP_DISABLED') === 'true') {
      return;
    }
    void this.runPollRound('startup');
  }

  /** 每 15 分钟整点拉取（秒=0） */
  @Cron('0 */15 * * * *')
  async handleCron(): Promise<void> {
    await this.runPollRound('cron');
  }

  private async runPollRound(trigger: string): Promise<void> {
    const skipRss =
      (trigger === 'startup' && this.config.get('FEED_RSS_POLL_STARTUP_DISABLED') === 'true') ||
      (trigger === 'cron' && this.config.get('FEED_RSS_POLL_DISABLED') === 'true');
    if (!skipRss) {
      try {
        await this.feedIngest.pollAllRssSources();
      } catch (e) {
        this.logger.error(`RSS [${trigger}] 拉取异常: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const skipHot =
      (trigger === 'startup' && this.config.get('FEED_NEWSONW_POLL_STARTUP_DISABLED') === 'true') ||
      (trigger === 'cron' && this.config.get('FEED_NEWSONW_POLL_DISABLED') === 'true');
    if (!skipHot) {
      try {
        await this.feedIngest.pollAllHotApiSources();
      } catch (e) {
        this.logger.error(`热点 [${trigger}] 拉取异常: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
