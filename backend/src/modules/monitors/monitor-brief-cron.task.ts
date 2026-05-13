import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { MonitorsService } from './monitors.service';

@Injectable()
export class MonitorBriefCronTask implements OnApplicationBootstrap {
  private readonly logger = new Logger(MonitorBriefCronTask.name);

  constructor(
    private readonly config: ConfigService,
    private readonly monitors: MonitorsService,
  ) {}

  /** 启动完成后异步跑一轮研判摘要，不阻塞 HTTP listen（与 FeedPollTask 一致） */
  onApplicationBootstrap(): void {
    if (this.startupDisabled()) {
      this.logger.log('monitor_brief_startup_skip MONITOR_BRIEF_STARTUP_DISABLED');
      return;
    }
    this.logger.log('monitor_brief_startup_begin');
    void this.runTick('startup');
  }

  /** 每小时整点；关闭请设 MONITOR_BRIEF_CRON_DISABLED=true */
  @Cron('0 0 * * * *')
  async handleCron(): Promise<void> {
    if (this.cronDisabled()) {
      this.logger.log('monitor_brief_cron_skip MONITOR_BRIEF_CRON_DISABLED');
      return;
    }
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

  private cronDisabled(): boolean {
    const v = this.config.get<string>('MONITOR_BRIEF_CRON_DISABLED')?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private startupDisabled(): boolean {
    const v = this.config.get<string>('MONITOR_BRIEF_STARTUP_DISABLED')?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
}
