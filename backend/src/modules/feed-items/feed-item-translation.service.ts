import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import {
  FeedItemTranslation,
  FeedItemTranslationDocument,
} from './schemas/feed-item-translation.schema';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { normalizeLocale, type SupportedLocale } from '../../common/utils/locale.utils';

const LOCALE_LABEL: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': 'Simplified Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

type TranslationJson = { title?: string; summary?: string };

@Injectable()
export class FeedItemTranslationService {
  constructor(
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(FeedItemTranslation.name)
    private readonly translationModel: Model<FeedItemTranslationDocument>,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
  ) {}

  async getTranslation(
    feedItemId: string,
    localeRaw: string | undefined,
  ): Promise<{ feedItemId: string; locale: SupportedLocale; title: string; summary: string; cached: boolean }> {
    if (!Types.ObjectId.isValid(feedItemId)) {
      throw new NotFoundException('feed_item_not_found');
    }
    const locale = normalizeLocale(localeRaw);
    const oid = new Types.ObjectId(feedItemId);

    const cached = await this.translationModel
      .findOne({ feedItemId: oid, locale })
      .lean()
      .exec();
    if (cached) {
      return {
        feedItemId,
        locale,
        title: cached.title,
        summary: cached.summary ?? '',
        cached: true,
      };
    }

    const item = await this.feedItemModel.findById(oid).lean().exec();
    if (!item) throw new NotFoundException('feed_item_not_found');

    const targetLang = LOCALE_LABEL[locale];
    const system = [
      'You translate news/article title and summary into the requested language.',
      'Return JSON only: {"title":"...","summary":"..."}.',
      'Preserve facts; do not add commentary. Keep summary length similar to source.',
    ].join(' ');
    const user = [
      `Target language: ${targetLang}`,
      `Title: ${item.title}`,
      `Summary: ${item.summary || '(empty)'}`,
    ].join('\n');

    const parsed = await this.llm.completeJson<TranslationJson>(system, user);
    const title = String(parsed.title ?? item.title).trim().slice(0, 500);
    const summary = String(parsed.summary ?? item.summary ?? '').trim().slice(0, 50000);

    await this.translationModel.updateOne(
      { feedItemId: oid, locale },
      { $set: { feedItemId: oid, locale, title, summary, model: 'deepseek-chat' } },
      { upsert: true },
    );

    return { feedItemId, locale, title, summary, cached: false };
  }
}
