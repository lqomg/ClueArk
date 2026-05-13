import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitorsService } from './monitors.service';

@Injectable()
export class MonitorBriefCronTask implements OnApplicationBootstrap {
  private readonly logger = new Logger(MonitorBriefCronTask.name);

  constructor(private readonly monitors: MonitorsService) {}

  /** 启动完成后异步跑一轮研判摘要，不阻塞 HTTP listen（与 FeedPollTask 一致） */
  onApplicationBootstrap(): void {
    this.logger.log('monitor_brief_startup_begin');
    void this.runTick('startup');
  }

  @Cron('0 0 * * * *')
  async handleCron(): Promise<void> {
    await this.runTick('cron');
  }

  private async runTick(trigger: string): Promise<void> {
    const t0 = Date.now();
    try {
      await this.monitors.runAllMonitorsBriefTick();
      this.logger.log(`monitor_brief_${trigger}_done ms=${Date.now() - t0}`);
    } catch (e) {
      this.logger.error(`monitor_brief_${trigger}_fail ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
