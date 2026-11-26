import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import type { EnqueueResult, LocalizeDevelopmentsPayload } from '../job-center/job.types';
import { UserPreferencesService } from '../users/user-preferences.service';
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  textLooksLikeLocale,
  type SupportedLocale,
} from '../../common/utils/locale.utils';
import { DevelopmentsService, type DevelopmentListItem } from './developments.service';
import {
  DevelopmentsReadLocalizationService,
  hashDevelopmentSourceText,
} from './developments-read-localization.service';
import { LoggerService } from '../logger';

export const LOCALIZE_DEVELOPMENTS_RECENT_LIMIT = 40;

export function developmentNeedsLocale(
  title: string,
  summary: string,
  locale: SupportedLocale,
): boolean {
  const srcTitle = title.trim();
  const srcSummary = summary.trim();
  return Boolean(
    (srcTitle && !textLooksLikeLocale(srcTitle, locale)) ||
      (srcSummary && !textLooksLikeLocale(srcSummary, locale)),
  );
}

@Injectable()
export class DevelopmentsLocalizeJobService {
  private readonly logger: LoggerService;

  constructor(
    private readonly scheduler: JobSchedulerService,
    private readonly userPreferences: UserPreferencesService,
    private readonly developments: DevelopmentsService,
    private readonly localization: DevelopmentsReadLocalizationService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(DevelopmentsLocalizeJobService.name);
  }

  /** wake 后：按产品支持语言入队预热 */
  async enqueueForDevelopment(params: {
    monitorId: string;
    developmentId: string;
    title: string;
    summary: string;
  }): Promise<void> {
    const needed = SUPPORTED_LOCALES.filter((locale) =>
      developmentNeedsLocale(params.title, params.summary, locale),
    );
    await this.enqueueLocales(params.monitorId, needed, {
      developmentIds: [params.developmentId],
      sourceHash: hashDevelopmentSourceText(params.title, params.summary),
      trigger: 'pipeline',
    });
  }

  async enqueueForSubscriber(monitorId: string, userId: string): Promise<void> {
    const locale = await this.userPreferences.getLocaleOrDefault(userId);
    await this.enqueueLocales(monitorId, [locale], {
      recentLimit: LOCALIZE_DEVELOPMENTS_RECENT_LIMIT,
      trigger: 'api',
    });
  }

  /** 读路径缓存未命中：按浏览者语言异步补预热 */
  async enqueueMissingForViewer(
    items: Array<{ id: string; monitorId: string; title: string; summary: string }>,
    localeRaw: string,
  ): Promise<void> {
    const locale = normalizeLocale(localeRaw);
    for (const item of items) {
      const id = String(item.id ?? '').trim();
      const monitorId = String(item.monitorId ?? '').trim();
      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(monitorId)) continue;
      if (!developmentNeedsLocale(item.title, item.summary, locale)) continue;
      await this.enqueueLocales(monitorId, [locale], {
        developmentIds: [id],
        sourceHash: hashDevelopmentSourceText(item.title, item.summary),
        trigger: 'api',
      });
    }
  }

  async runFromJob(payload: LocalizeDevelopmentsPayload): Promise<Record<string, unknown>> {
    const monitorId = String(payload.monitorId ?? '').trim();
    const locales = resolveLocalizePayloadLocales(payload);
    if (!Types.ObjectId.isValid(monitorId)) {
      return { skipped: true, reason: 'invalid_monitor' };
    }
    if (!locales.length) {
      return { skipped: true, reason: 'missing_locale' };
    }

    const ids = (payload.developmentIds ?? []).map((id) => String(id).trim()).filter(Boolean);
    let items: DevelopmentListItem[];
    if (ids.length) {
      items = await this.developments.listByIds(monitorId, ids);
    } else {
      const limit = Math.min(
        50,
        Math.max(1, Math.floor(payload.recentLimit ?? LOCALIZE_DEVELOPMENTS_RECENT_LIMIT)),
      );
      const listed = await this.developments.listForMonitor(monitorId, { page: 1, pageSize: limit });
      items = listed.items;
    }

    const hashesAtStart = new Map(
      items.map((item) => [item.id, hashDevelopmentSourceText(item.title, item.summary)] as const),
    );

    let translated = 0;
    const byLocale: Record<string, { scanned: number; translated: number }> = {};
    for (const locale of locales) {
      const need = items.filter((item) => developmentNeedsLocale(item.title, item.summary, locale));
      if (!need.length) {
        byLocale[locale] = { scanned: items.length, translated: 0 };
        continue;
      }
      const localized = await this.localization.localizeDevelopments(need, locale, {
        waitForLlm: true,
      });
      const n = localized.filter((item, i) => {
        const src = need[i];
        return src && (item.title !== src.title || item.summary !== src.summary);
      }).length;
      translated += n;
      byLocale[locale] = { scanned: items.length, translated: n };
    }

    const drifted = await this.requeueIfSourceDrifted(monitorId, ids, hashesAtStart, locales);

    return {
      monitorId,
      locales,
      locale: locales.length === 1 ? locales[0] : undefined,
      scanned: items.length,
      translated,
      byLocale,
      driftedRequeued: drifted,
    };
  }

  private async requeueIfSourceDrifted(
    monitorId: string,
    ids: string[],
    hashesAtStart: Map<string, string>,
    locales: SupportedLocale[],
  ): Promise<number> {
    if (!ids.length || !hashesAtStart.size) return 0;
    const fresh = await this.developments.listByIds(monitorId, ids);
    let requeued = 0;
    for (const item of fresh) {
      const prev = hashesAtStart.get(item.id);
      if (!prev) continue;
      const next = hashDevelopmentSourceText(item.title, item.summary);
      if (next === prev) continue;
      const needed = locales.filter((locale) =>
        developmentNeedsLocale(item.title, item.summary, locale),
      );
      if (!needed.length) continue;
      await this.enqueueLocales(monitorId, needed, {
        developmentIds: [item.id],
        sourceHash: next,
        trigger: 'pipeline',
      });
      requeued += 1;
      this.logger.warn(
        `event=localize_source_drift_requeue monitorId=${monitorId} developmentId=${item.id} locales=${needed.join('+')}`,
      );
    }
    return requeued;
  }

  private async enqueueLocales(
    monitorId: string,
    locales: SupportedLocale[],
    opts: {
      developmentIds?: string[];
      recentLimit?: number;
      sourceHash?: string;
      trigger: 'pipeline' | 'api';
    },
  ): Promise<EnqueueResult[]> {
    const unique = [...new Set(locales)];
    if (!unique.length) return [];
    return [
      await this.scheduler.enqueueLocalizeDevelopments(monitorId, unique, {
        trigger: opts.trigger,
        developmentIds: opts.developmentIds,
        recentLimit: opts.recentLimit,
        sourceHash: opts.sourceHash,
      }),
    ];
  }
}

export function resolveLocalizePayloadLocales(
  payload: Pick<LocalizeDevelopmentsPayload, 'locale' | 'locales'>,
): SupportedLocale[] {
  const fromList = Array.isArray(payload.locales)
    ? payload.locales.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (fromList.length) {
    return [...new Set(fromList.map((x) => normalizeLocale(x)))];
  }
  const single = String(payload.locale ?? '').trim();
  return single ? [normalizeLocale(single)] : [];
}
