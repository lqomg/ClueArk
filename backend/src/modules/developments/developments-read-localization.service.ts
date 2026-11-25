import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LOCALE_OUTPUT_LABEL,
  normalizeLocale,
  textLooksLikeLocale,
  type SupportedLocale,
} from '../../common/utils/locale.utils';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { LoggerService } from '../logger';
import type { DevelopmentListItem } from './developments.service';
import {
  DevelopmentTranslation,
  DevelopmentTranslationDocument,
} from './schemas/development-translation.schema';

export function hashDevelopmentSourceText(title: string, summary: string): string {
  return createHash('sha256').update(`${title}\n${summary}`).digest('hex').slice(0, 32);
}

type TranslationJson = { title?: string; summary?: string };

/**
 * 读路径：优先 translation 缓存；可选 waitForLlm 同步补译并写缓存。
 */
@Injectable()
export class DevelopmentsReadLocalizationService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(DevelopmentTranslation.name)
    private readonly translationModel: Model<DevelopmentTranslationDocument>,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(DevelopmentsReadLocalizationService.name);
  }

  async localizeDevelopments<T extends Pick<DevelopmentListItem, 'id' | 'title' | 'summary'>>(
    items: T[],
    localeRaw: string,
    opts?: { waitForLlm?: boolean },
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

    const result: T[] = [];
    for (const item of items) {
      const cached = byId.get(item.id);
      const expected = hashDevelopmentSourceText(item.title, item.summary);
      if (cached && String(cached.sourceHash ?? '').trim() === expected) {
        result.push({
          ...item,
          title: String(cached.title ?? item.title).slice(0, 500),
          summary: String(cached.summary ?? item.summary).slice(0, 4000),
        });
        continue;
      }

      if (
        textLooksLikeLocale(item.title, locale) &&
        textLooksLikeLocale(item.summary, locale)
      ) {
        result.push(item);
        continue;
      }

      if (!opts?.waitForLlm) {
        result.push(item);
        continue;
      }

      try {
        const translated = await this.translateOne(item.title, item.summary, locale);
        await this.upsertTranslationCache({
          developmentId: item.id,
          locale,
          title: translated.title,
          summary: translated.summary,
          sourceTitle: item.title,
          sourceSummary: item.summary,
          model: 'deepseek-chat',
        });
        result.push({
          ...item,
          title: translated.title,
          summary: translated.summary,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `event=dev_localize_llm_fail id=${item.id} locale=${locale} err=${msg.slice(0, 120)}`,
        );
        result.push(item);
      }
    }
    return result;
  }

  private async translateOne(
    title: string,
    summary: string,
    locale: SupportedLocale,
  ): Promise<{ title: string; summary: string }> {
    const targetLang = LOCALE_OUTPUT_LABEL[locale];
    const system = [
      'You translate intelligence development title and summary into the requested language.',
      'Return JSON only: {"title":"...","summary":"..."}.',
      'Preserve facts; do not add commentary. Keep summary length similar to source.',
    ].join(' ');
    const user = [
      `Target language: ${targetLang}`,
      `Title: ${title}`,
      `Summary: ${summary || '(empty)'}`,
    ].join('\n');
    const parsed = await this.llm.completeJson<TranslationJson>(system, user);
    const outTitle = String(parsed.title ?? title).trim().slice(0, 500);
    const outSummary = String(parsed.summary ?? summary ?? '').trim().slice(0, 4000);
    return { title: outTitle || title, summary: outSummary };
  }

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
