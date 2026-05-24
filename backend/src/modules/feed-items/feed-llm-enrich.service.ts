import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import { buildFeedEnrichSystemPrompt, buildFeedEnrichUserPayload } from './feed-llm-prompts';
import { FEED_MIN_SUMMARY_LEN_FOR_LLM } from './feed-llm.constants';

const MAX_TAGS = 6;
const MAX_TAG_LEN = 24;

type EnrichJson = {
  tags?: unknown;
  recommendReason?: unknown;
};

/** 开放标签：去重、长度与数量限制，不做词表过滤 */
function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_TAGS; i++) {
    const t = String(raw[i] ?? '')
      .trim()
      .slice(0, MAX_TAG_LEN);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function normalizeReason(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  return s.slice(0, 2000);
}

function isEnrichShape(v: unknown): v is EnrichJson {
  return v != null && typeof v === 'object';
}

@Injectable()
export class FeedLlmEnrichService {
  private readonly logger = new Logger(FeedLlmEnrichService.name);

  constructor(
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    private readonly config: ConfigService,
    private readonly scheduler: JobSchedulerService,
  ) {}

  /**
   * 将被监控信源上的 pending（或超时 processing）条目入队 enrich_llm。
   * 供管理员补救；日常由 pipeline 在 process_new_item 后入队。
   */
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

    const docs = await this.feedItemModel
      .find({
        sourceId: { $in: sourceIds },
        $or: [{ llmStatus: 'pending' }, { llmStatus: 'processing', updatedAt: { $lt: staleBefore } }],
      })
      .sort({ createdAt: 1 })
      .limit(n)
      .select({ _id: 1 })
      .lean()
      .exec();

    for (let i = 0; i < docs.length; i++) {
      await this.scheduler.enqueueEnrichItem(String(docs[i]._id), { trigger: 'manual' });
    }
    if (docs.length) {
      this.logger.debug(`event=enrich_monitored_pending_enqueued count=${docs.length}`);
    }
    return { enqueued: docs.length, skipped: false };
  }

  /** 队列 worker：按 id 富化单条 */
  async enrichOneById(feedItemId: string): Promise<void> {
    const key = this.config.get<string>('DEEPSEEK_API_KEY')?.trim();
    if (!key) return;
    const doc = await this.feedItemModel
      .findById(feedItemId)
      .populate({ path: 'sourceId', select: 'displayName' })
      .lean()
      .exec();
    if (!doc) return;
    if (doc.llmStatus === 'done' || doc.llmStatus === 'skipped') {
      return;
    }
    try {
      await this.enrichOne(doc as Record<string, unknown>);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.feedItemModel
        .updateOne({ _id: feedItemId }, { $set: { llmStatus: 'failed', llmError: msg.slice(0, 2000) } })
        .exec();
      this.logger.warn(`LLM 富化失败 [${feedItemId}]: ${msg}`);
    }
  }

  private async enrichOne(doc: Record<string, unknown>): Promise<void> {
    const title = String(doc.title ?? '');
    const summary = String(doc.summary ?? '');
    if (summary.trim().length < FEED_MIN_SUMMARY_LEN_FOR_LLM) {
      await this.feedItemModel
        .updateOne(
          { _id: doc._id as Types.ObjectId },
          {
            $set: {
              llmStatus: 'skipped',
              llmTags: [],
              llmRecommendReason: '',
              llmModel: '',
              llmError: '',
            },
          },
        )
        .exec();
      return;
    }
    const sid = doc.sourceId;
    let sourceDisplayName = '';
    if (sid && typeof sid === 'object') {
      sourceDisplayName = String((sid as { displayName?: string }).displayName ?? '');
    }

    const system = buildFeedEnrichSystemPrompt();
    const user = buildFeedEnrichUserPayload({ title, summary, sourceDisplayName });
    const raw = await this.llm.completeJson<unknown>(system, user);
    if (!isEnrichShape(raw)) throw new Error('LLM 返回格式无效');

    const llmTags = normalizeTags(raw.tags);
    const llmRecommendReason = normalizeReason(raw.recommendReason);
    const llmModel = this.config.get<string>('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat';

    await this.feedItemModel
      .updateOne(
        { _id: doc._id as Types.ObjectId },
        {
          $set: {
            llmStatus: 'done',
            llmTags,
            llmRecommendReason,
            llmModel,
            llmError: '',
          },
        },
      )
      .exec();
  }
}
