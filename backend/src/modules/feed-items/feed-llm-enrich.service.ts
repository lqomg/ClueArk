import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import { FeedItemLlm, FeedItemLlmDocument } from './schemas/feed-item-llm.schema';
import { FeedItemLlmService } from './feed-item-llm.service';
import { buildFeedEnrichSystemPrompt, buildFeedEnrichUserPayload } from './feed-llm-prompts';
import { FEED_MIN_SUMMARY_LEN_FOR_LLM } from './feed-llm.constants';
import { parseAndValidateEnrichResponse } from './feed-llm-enrich.parse';

@Injectable()
export class FeedLlmEnrichService {
  private readonly logger = new Logger(FeedLlmEnrichService.name);

  constructor(
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(FeedItemLlm.name) private readonly llmModel: Model<FeedItemLlmDocument>,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    private readonly config: ConfigService,
    private readonly scheduler: JobSchedulerService,
    private readonly llmService: FeedItemLlmService,
  ) {}

  async enqueueMonitoredPending(limit: number): Promise<{ enqueued: number; skipped: boolean }> {
    const key = this.config.get<string>('DEEPSEEK_API_KEY')?.trim();
    if (!key) {
      this.logger.warn('DEEPSEEK_API_KEY 未配置，跳过 LLM 富化入队');
      return { enqueued: 0, skipped: true };
    }
    const n = Math.min(Math.max(1, limit | 0), 500);
    const staleBefore = new Date(Date.now() - 20 * 60 * 1000);
    const monitored = await this.sourceModel
      .find({
        enabled: true,
        monitoredByCount: { $gt: 0 },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .select({ _id: 1 })
      .lean()
      .exec();
    const sourceIds = monitored.map((s) => s._id as Types.ObjectId);
    if (!sourceIds.length) return { enqueued: 0, skipped: false };

    const llmRows = await this.llmModel
      .find({
        $or: [{ status: 'pending' }, { status: 'processing', updatedAt: { $lt: staleBefore } }],
      })
      .sort({ updatedAt: 1 })
      .limit(n * 3)
      .select({ feedItemId: 1 })
      .lean()
      .exec();
    if (!llmRows.length) return { enqueued: 0, skipped: false };

    const candidateIds = llmRows.map((r) => r.feedItemId as Types.ObjectId);
    const monitoredItems = await this.feedItemModel
      .find({ _id: { $in: candidateIds }, sourceId: { $in: sourceIds } })
      .select({ _id: 1 })
      .limit(n)
      .lean()
      .exec();

    for (const row of monitoredItems) {
      await this.scheduler.enqueueEnrichItem(String(row._id), { trigger: 'manual' });
    }
    if (monitoredItems.length) {
      this.logger.debug(`event=enrich_monitored_pending_enqueued count=${monitoredItems.length}`);
    }
    return { enqueued: monitoredItems.length, skipped: false };
  }

  async enrichOneById(feedItemId: string): Promise<void> {
    const key = this.config.get<string>('DEEPSEEK_API_KEY')?.trim();
    if (!key) return;
    const oid = Types.ObjectId.isValid(feedItemId) ? new Types.ObjectId(feedItemId) : null;
    if (!oid) return;

    const existing = await this.llmModel
      .findOne({ feedItemId: oid, status: { $in: ['done', 'skipped'] } })
      .lean()
      .exec();
    if (existing) return;

    const doc = await this.feedItemModel
      .findById(feedItemId)
      .populate({ path: 'sourceId', select: 'displayName' })
      .lean()
      .exec();
    if (!doc) return;

    try {
      await this.enrichOne(doc as Record<string, unknown>, oid);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.llmService.upsertFailed(oid, msg);
      this.logger.warn(`LLM enrich failed [${feedItemId}]: ${msg}`);
    }
  }

  private async enrichOne(doc: Record<string, unknown>, feedItemId: Types.ObjectId): Promise<void> {
    const title = String(doc.title ?? '');
    const summary = String(doc.summary ?? '');

    if (summary.trim().length < FEED_MIN_SUMMARY_LEN_FOR_LLM) {
      await this.llmService.upsertSkipped(feedItemId);
      return;
    }

    await this.llmService.markProcessing(feedItemId);

    const sid = doc.sourceId;
    let sourceDisplayName = '';
    if (sid && typeof sid === 'object') {
      sourceDisplayName = String((sid as { displayName?: string }).displayName ?? '');
    }

    const system = buildFeedEnrichSystemPrompt();
    const user = buildFeedEnrichUserPayload({ title, summary, sourceDisplayName });
    const raw = await this.llm.completeJson<unknown>(system, user);
    const parsed = parseAndValidateEnrichResponse(raw);
    const llmModel = this.config.get<string>('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat';

    await this.llmService.upsertDone(feedItemId, {
      tagKeys: parsed.tagKeys,
      locales: parsed.locales,
      llmModel,
    });
  }
}
