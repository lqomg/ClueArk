import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedIngestService } from '../feed-items/feed-ingest.service';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { resolveBriefProfiles } from '../monitors/brief-profiles';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { SOURCE_KIND } from '../sources/source-kind';
import { clampPollIntervalSec, pollIntervalBoundsFromConfig } from '../sources/source-poll-interval.util';
import { LoggerService } from '../logger';
import { JobSchedulerService } from './job-scheduler.service';

@Injectable()
export class JobTickScheduler implements OnApplicationBootstrap {
  private readonly logger: LoggerService;
  private sourceTicking = false;
  private crawlTicking = false;

  constructor(
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    private readonly scheduler: JobSchedulerService,
    private readonly ingest: FeedIngestService,
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(JobTickScheduler.name);
  }

  onApplicationBootstrap(): void {
    void this.sourcePollTick('startup');
    void this.crawlWebTick('startup');
  }

  @Cron('*/15 * * * * *')
  async sourcePollCron(): Promise<void> {
    await this.sourcePollTick('cron');
  }

  @Cron('*/30 * * * * *')
  async crawlWebCron(): Promise<void> {
    await this.crawlWebTick('cron');
  }

  @Cron('*/5 * * * *')
  async snapshotCron(): Promise<void> {
    const rows = await this.monitorModel
      .find({
        deletedAt: null,
        snapshotStatus: { $in: ['stale', 'failed', 'pending', 'computing'] },
      })
      .select({ _id: 1 })
      .limit(50)
      .lean()
      .exec();
    const rh = Number(this.config.get('MONITOR_SNAPSHOT_DEFAULT_RECENT_HOURS')) || 720;
    for (const r of rows) {
      await this.scheduler.enqueueComputeSnapshot(String(r._id), rh, 5, { trigger: 'cron' });
    }
    if (rows.length) {
      this.logger.log(`event=snapshot_tick_enqueued count=${rows.length}`);
    }
  }

  @Cron('0 0 * * * *')
  async briefCron(): Promise<void> {
    const profiles = resolveBriefProfiles(this.config).filter((p) => p.enabled);
    const rows = await this.monitorModel.find({ deletedAt: null }).select({ _id: 1 }).lean().exec();
    let enqueued = 0;
    for (const r of rows) {
      const monitorId = String(r._id);
      for (const profile of profiles) {
        const res = await this.scheduler.enqueueRunBrief(monitorId, profile.profileId, {
          trigger: 'cron',
        });
        if (!res.skipped) enqueued++;
      }
    }
    this.logger.log(
      `event=brief_tick_enqueued monitors=${rows.length} profiles=${profiles.length} jobs=${enqueued}`,
    );
  }

  private clampPollSec(raw: number | undefined): number {
    const b = pollIntervalBoundsFromConfig((k) => this.config.get(k));
    return clampPollIntervalSec(raw, b.min, b.max, b.def);
  }

  private async sourcePollTick(trigger: string): Promise<void> {
    if (this.sourceTicking) return;
    this.sourceTicking = true;
    const now = new Date();
    try {
      const due = await this.sourceModel
        .find({
          enabled: true,
          kind: { $in: [SOURCE_KIND.RSS, SOURCE_KIND.HOT_API] },
          $and: [
            { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
            { $or: [{ nextPollAt: null }, { nextPollAt: { $lte: now } }] },
          ],
        })
        .limit(20)
        .exec();

      for (const src of due) {
        const sourceId = String(src._id);
        if (src.kind === SOURCE_KIND.RSS && src.rss?.feedUrl) {
          await this.scheduler.enqueue({
            type: 'source_poll',
            payload: { sourceId, kind: 'rss', feedUrl: src.rss.feedUrl },
            trigger: trigger === 'startup' ? 'startup' : 'cron',
          });
        } else if (src.kind === SOURCE_KIND.HOT_API && src.hot?.url) {
          await this.scheduler.enqueue({
            type: 'source_poll',
            payload: { sourceId, kind: 'hot_api' },
            trigger: trigger === 'startup' ? 'startup' : 'cron',
          });
        }
      }
      if (due.length) {
        this.logger.log(`event=source_poll_tick trigger=${trigger} enqueued=${due.length}`);
      }
    } finally {
      this.sourceTicking = false;
    }
  }

  private async crawlWebTick(trigger: string): Promise<void> {
    if (this.crawlTicking) return;
    this.crawlTicking = true;
    try {
      const rows = await this.ingest.listWebSourcesForCrawler();
      const now = Date.now();
      const due = rows.filter((r) => {
        if (!r.nextPollAt) return true;
        const t = Date.parse(r.nextPollAt);
        return !Number.isFinite(t) || t <= now;
      });

      const rawMax = Number(this.config.get('CRAWLER_MAX_ITEMS'));
      const maxItems =
        Number.isFinite(rawMax) && rawMax >= 1 && rawMax <= 200 ? Math.floor(rawMax) : 50;

      for (const row of due) {
        await this.scheduler.enqueue({
          type: 'crawl_web',
          payload: {
            sourceId: row.sourceId,
            listUrl: row.listUrl,
            maxItems,
            ...(row.selectors ? { selectors: row.selectors } : {}),
          },
          trigger: trigger === 'startup' ? 'startup' : 'cron',
        });
      }
      if (due.length) {
        this.logger.log(`event=crawl_web_tick trigger=${trigger} enqueued=${due.length}`);
      }
    } finally {
      this.crawlTicking = false;
    }
  }
}
