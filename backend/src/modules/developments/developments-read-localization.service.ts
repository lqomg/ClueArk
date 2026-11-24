import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { normalizeLocale, type SupportedLocale } from '../../common/utils/locale.utils';
import type { DevelopmentListItem } from './developments.service';
import {
  DevelopmentTranslation,
  DevelopmentTranslationDocument,
} from './schemas/development-translation.schema';

export function hashDevelopmentSourceText(title: string, summary: string): string {
  return createHash('sha256').update(`${title}\n${summary}`).digest('hex').slice(0, 32);
}

/**
 * 阶段 3：只读 translation 缓存覆盖；未命中则返回原文。
 * 异步 LLM 预热留到阶段 8（localize_developments job）。
 */
@Injectable()
export class DevelopmentsReadLocalizationService {
  constructor(
    @InjectModel(DevelopmentTranslation.name)
    private readonly translationModel: Model<DevelopmentTranslationDocument>,
  ) {}

  async localizeDevelopments<T extends Pick<DevelopmentListItem, 'id' | 'title' | 'summary'>>(
    items: T[],
    localeRaw: string,
  ): Promise<T[]> {
    const locale = normalizeLocale(localeRaw);
    if (!items.length) return items;

    const oids = items
      .map((item) => item.id)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!oids.length) return items;

    const cachedRows = await this.translationModel
      .find({ developmentId: { $in: oids }, locale })
      .select({ developmentId: 1, title: 1, summary: 1, sourceHash: 1 })
      .lean()
      .exec();
    const byId = new Map(cachedRows.map((row) => [String(row.developmentId), row] as const));

    return items.map((item) => {
      const cached = byId.get(item.id);
      if (!cached) return item;
      const expected = hashDevelopmentSourceText(item.title, item.summary);
      if (String(cached.sourceHash ?? '').trim() !== expected) return item;
      return {
        ...item,
        title: String(cached.title ?? item.title).slice(0, 500),
        summary: String(cached.summary ?? item.summary).slice(0, 4000),
      };
    });
  }

  /** 测试 / 阶段 8 写入缓存入口 */
  async upsertTranslationCache(input: {
    developmentId: string;
    locale: SupportedLocale | string;
    title: string;
    summary: string;
    sourceTitle: string;
    sourceSummary: string;
    model?: string;
  }): Promise<void> {
    if (!Types.ObjectId.isValid(input.developmentId)) return;
    const locale = normalizeLocale(input.locale);
    await this.translationModel
      .findOneAndUpdate(
        {
          developmentId: new Types.ObjectId(input.developmentId),
          locale,
        },
        {
          $set: {
            title: input.title.slice(0, 500),
            summary: input.summary.slice(0, 4000),
            model: String(input.model ?? '').slice(0, 64),
            sourceHash: hashDevelopmentSourceText(input.sourceTitle, input.sourceSummary),
          },
        },
        { upsert: true },
      )
      .exec();
  }
}
