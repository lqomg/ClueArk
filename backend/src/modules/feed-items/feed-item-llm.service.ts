import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  normalizeLocale,
  resolveAppDefaultLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '../../common/utils/locale.utils';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import {
  FeedItemLlm,
  FeedItemLlmDocument,
  FeedItemLlmLocaleContent,
  FeedItemLlmStatus,
} from './schemas/feed-item-llm.schema';
import { FEED_MIN_SUMMARY_LEN_FOR_LLM } from './feed-llm.constants';

export type FeedLlmView = {
  tagKeys: string[];
  tags: string[];
  recommendReason: string;
  status: FeedItemLlmStatus;
};

const EMPTY_VIEW: FeedLlmView = {
  tagKeys: [],
  tags: [],
  recommendReason: '',
  status: 'pending',
};

@Injectable()
export class FeedItemLlmService {
  constructor(
    @InjectModel(FeedItemLlm.name)
    private readonly llmModel: Model<FeedItemLlmDocument>,
    @InjectModel(FeedItem.name)
    private readonly feedItemModel: Model<FeedItemDocument>,
  ) {}

  resolveView(
    row: Pick<FeedItemLlm, 'tagKeys' | 'locales' | 'status'> | null | undefined,
    viewerLocale: SupportedLocale,
    fallbackLocale: SupportedLocale,
  ): FeedLlmView | null {
    if (!row) return null;
    const localeContent = this.pickLocaleContent(row.locales ?? {}, viewerLocale, fallbackLocale);
    return {
      tagKeys: Array.isArray(row.tagKeys) ? row.tagKeys.map(String) : [],
      tags: localeContent?.tags ?? [],
      recommendReason: localeContent?.recommendReason ?? '',
      status: row.status ?? 'pending',
    };
  }

  async resolveViewById(
    feedItemId: string,
    viewerLocale: SupportedLocale,
    fallbackLocale: SupportedLocale,
  ): Promise<FeedLlmView | null> {
    const oid = Types.ObjectId.isValid(feedItemId) ? new Types.ObjectId(feedItemId) : null;
    if (!oid) return null;
    const row = await this.llmModel.findOne({ feedItemId: oid }).lean().exec();
    return this.resolveView(row, viewerLocale, fallbackLocale);
  }

  async resolveViews(
    feedItemIds: string[],
    viewerLocale: SupportedLocale,
    fallbackLocale: SupportedLocale,
  ): Promise<Map<string, FeedLlmView>> {
    const map = new Map<string, FeedLlmView>();
    const oids = feedItemIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (!oids.length) return map;
    const rows = await this.llmModel.find({ feedItemId: { $in: oids } }).lean().exec();
    for (const row of rows) {
      const view = this.resolveView(row, viewerLocale, fallbackLocale);
      if (view) map.set(String(row.feedItemId), view);
    }
    return map;
  }

  async ensureInitialForNewItems(itemIds: Types.ObjectId[], forceSkipped = false): Promise<void> {
    if (!itemIds.length) return;
    if (forceSkipped) {
      await Promise.all(itemIds.map((id) => this.upsertSkipped(id)));
      return;
    }
    const rows = await this.feedItemModel
      .find({ _id: { $in: itemIds } })
      .select({ summary: 1 })
      .lean()
      .exec();
    await Promise.all(
      rows.map((row) => {
        const summary = String(row.summary ?? '');
        if (summary.trim().length < FEED_MIN_SUMMARY_LEN_FOR_LLM) {
          return this.upsertSkipped(row._id as Types.ObjectId);
        }
        return this.upsertPending(row._id as Types.ObjectId);
      }),
    );
  }

  async upsertPending(feedItemId: Types.ObjectId): Promise<void> {
    await this.llmModel
      .updateOne(
        { feedItemId },
        {
          $setOnInsert: {
            feedItemId,
            status: 'pending',
            tagKeys: [],
            locales: {},
            llmModel: '',
            llmError: '',
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async upsertSkipped(feedItemId: Types.ObjectId): Promise<void> {
    await this.llmModel
      .updateOne(
        { feedItemId },
        {
          $set: {
            status: 'skipped',
            tagKeys: [],
            locales: {},
            llmModel: '',
            llmError: '',
          },
          $setOnInsert: { feedItemId },
        },
        { upsert: true },
      )
      .exec();
  }

  async markProcessing(feedItemId: Types.ObjectId): Promise<boolean> {
    const res = await this.llmModel
      .updateOne(
        { feedItemId, status: { $in: ['pending', 'failed'] } },
        { $set: { status: 'processing', llmError: '' } },
      )
      .exec();
    return res.modifiedCount > 0 || res.matchedCount > 0;
  }

  async upsertDone(
    feedItemId: Types.ObjectId,
    data: {
      tagKeys: string[];
      locales: Record<SupportedLocale, FeedItemLlmLocaleContent>;
      llmModel: string;
    },
  ): Promise<void> {
    await this.llmModel
      .updateOne(
        { feedItemId },
        {
          $set: {
            status: 'done',
            tagKeys: data.tagKeys,
            locales: data.locales,
            llmModel: data.llmModel,
            llmError: '',
          },
          $setOnInsert: { feedItemId },
        },
        { upsert: true },
      )
      .exec();
  }

  async upsertFailed(feedItemId: Types.ObjectId, error: string): Promise<void> {
    await this.llmModel
      .updateOne(
        { feedItemId },
        {
          $set: {
            status: 'failed',
            llmError: error.slice(0, 2000),
          },
          $setOnInsert: {
            feedItemId,
            tagKeys: [],
            locales: {},
            llmModel: '',
          },
        },
        { upsert: true },
      )
      .exec();
  }

  static defaultFallbackLocale(fromEnv?: string): SupportedLocale {
    return resolveAppDefaultLocale(fromEnv);
  }

  static normalizeLocaleInput(raw?: string): SupportedLocale {
    return normalizeLocale(raw);
  }

  static emptyView(): FeedLlmView {
    return { ...EMPTY_VIEW };
  }

  private pickLocaleContent(
    locales: Record<string, FeedItemLlmLocaleContent>,
    viewerLocale: SupportedLocale,
    fallbackLocale: SupportedLocale,
  ): FeedItemLlmLocaleContent | null {
    const direct = locales[viewerLocale];
    if (direct) return this.normalizeLocaleContent(direct);
    const fallback = locales[fallbackLocale];
    if (fallback) return this.normalizeLocaleContent(fallback);
    for (const loc of SUPPORTED_LOCALES) {
      const row = locales[loc];
      if (row) return this.normalizeLocaleContent(row);
    }
    return null;
  }

  private normalizeLocaleContent(raw: FeedItemLlmLocaleContent): FeedItemLlmLocaleContent {
    return {
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      recommendReason: String(raw.recommendReason ?? '').trim(),
    };
  }
}
