import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import { buildFeedEnrichSystemPrompt, buildFeedEnrichUserPayload } from './feed-llm-prompts';
import { FEED_MIN_SUMMARY_LEN_FOR_LLM } from './feed-llm.constants';

const MAX_TAGS = 6;
const MAX_TAG_LEN = 24;

type EnrichJson = {
  tags?: unknown;
  recommendReason?: unknown;
  priority?: unknown;
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

function normalizePriority(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 30;
  return Math.min(100, Math.max(0, Math.round(n)));
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
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    private readonly config: ConfigService,
  ) {}

  /**
   * 批量处理 pending；单条失败写入 failed，不阻塞后续。
   * 未配置 DEEPSEEK_API_KEY 时跳过（skipped=true）。
   */
  async processPending(limit: number): Promise<{
    processed: number;
    ok: number;
    failed: number;
    skipped: boolean;
  }> {
    const key = this.config.get<string>('DEEPSEEK_API_KEY')?.trim();
    if (!key) {
      this.logger.warn('DEEPSEEK_API_KEY 未配置，跳过 LLM 富化');
      return { processed: 0, ok: 0, failed: 0, skipped: true };
    }
    const n = Math.min(Math.max(1, limit | 0), 200);
    const staleBefore = new Date(Date.now() - 20 * 60 * 1000);
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < n; i++) {
      const doc = await this.feedItemModel
        .findOneAndUpdate(
          {
            $or: [{ llmStatus: 'pending' }, { llmStatus: 'processing', updatedAt: { $lt: staleBefore } }],
          },
          { $set: { llmStatus: 'processing' } },
          { new: true, sort: { createdAt: 1 } },
        )
        .populate({ path: 'sourceId', select: 'displayName' })
        .lean()
        .exec();
      if (!doc) break;
      try {
        await this.enrichOne(doc as Record<string, unknown>);
        ok += 1;
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        await this.feedItemModel
          .updateOne({ _id: doc._id }, { $set: { llmStatus: 'failed', llmError: msg.slice(0, 2000) } })
          .exec();
        this.logger.warn(`LLM 富化失败 [${String(doc._id)}]: ${msg}`);
      }
    }
    return { processed: ok + failed, ok, failed, skipped: false };
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
              llmPriority: null,
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
    const llmPriority = normalizePriority(raw.priority);
    const llmModel = this.config.get<string>('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat';

    await this.feedItemModel
      .updateOne(
        { _id: doc._id as Types.ObjectId },
        {
          $set: {
            llmStatus: 'done',
            llmTags,
            llmRecommendReason,
            llmPriority,
            llmModel,
            llmError: '',
          },
        },
      )
      .exec();
  }
}
