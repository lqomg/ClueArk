import { Inject, Injectable } from '@nestjs/common';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { LoggerService } from '../logger';
import { normalizeLocale, type SupportedLocale } from '../../common/utils/locale.utils';
import type { AdmissionReason } from './admission.util';
import { coerceWakeDropConsistency } from './author-action-consistency.util';
import { developmentTitleLengthRule } from './development-title-length.util';
import type { GateFinalAction } from './schemas/monitor-gate-decision.schema';

export type AuthorDevelopmentInput = {
  monitorId: string;
  feedItemId: string;
  monitorTitle: string;
  topicPrompt: string;
  description: string;
  title: string;
  summary: string;
  quote: string;
  admissionReasons: AdmissionReason[];
  semanticScore: number | null;
  locale?: string | null;
  /** 可选：目录摘要，帮助模型判断挂旧卡 vs 新开 */
  catalogBlurbs?: Array<{ id: string; title: string; blurb: string }>;
  forcedAttachDevelopmentId?: string | null;
};

export type AuthorDevelopmentResult = {
  action: GateFinalAction;
  importance: 'critical' | 'high' | 'medium';
  title: string;
  summary: string;
  whyItMatters: string;
  watchNext: string;
  reason: string;
  latencyMs: number | null;
  failed: boolean;
  /** 模型建议挂靠的进展 id（可空） */
  attachDevelopmentId: string | null;
  mergeMode: 'upsert_text' | 'evidence_only';
};

type LlmAuthorPayload = {
  action?: unknown;
  importance?: unknown;
  title?: unknown;
  summary?: unknown;
  whyItMatters?: unknown;
  watchNext?: unknown;
  reason?: unknown;
  attachDevelopmentId?: unknown;
  mergeMode?: unknown;
};

const LOCALE_LABEL: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': 'Simplified Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

@Injectable()
export class AuthorDevelopmentService {
  private readonly logger: LoggerService;

  constructor(
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(AuthorDevelopmentService.name);
  }

  async author(input: AuthorDevelopmentInput): Promise<AuthorDevelopmentResult> {
    const locale = normalizeLocale(input.locale);
    const forcedAttach = String(input.forcedAttachDevelopmentId ?? '').trim() || null;
    const catalog = (input.catalogBlurbs ?? []).slice(0, 40);
    const system = [
      'You are the gate author for a topic intelligence product.',
      'Decide wake (material development worth recording) or drop (noise / off-topic / no new verifiable fact).',
      'On wake: write a concise title and summary of the development, not a restatement of the raw headline alone.',
      developmentTitleLengthRule(locale),
      `Write wake title/summary/whyItMatters/watchNext in ${LOCALE_LABEL[locale]}.`,
      'Respond with JSON only: { action, importance, title, summary, whyItMatters, watchNext, reason, attachDevelopmentId, mergeMode }.',
      'action must be "wake" or "drop". importance: critical|high|medium.',
      'attachDevelopmentId: id from catalog to merge into, or empty string for a new card.',
      'mergeMode: "upsert_text" (refresh card text) or "evidence_only" (only add evidence when attaching).',
      'If drop: title/summary may be empty; reason must explain briefly.',
      forcedAttach
        ? `Prefer attaching to development id ${forcedAttach} unless the item is clearly a new claim.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    const user = JSON.stringify(
      {
        monitor: {
          id: input.monitorId,
          title: input.monitorTitle,
          topicPrompt: input.topicPrompt,
          description: input.description.slice(0, 1200),
        },
        item: {
          id: input.feedItemId,
          title: input.title.slice(0, 300),
          summary: input.summary.slice(0, 2000),
          quote: input.quote.slice(0, 800),
        },
        admission: {
          reasons: input.admissionReasons,
          semanticScore: input.semanticScore,
        },
        catalog: catalog.map((c) => ({
          id: c.id,
          title: c.title.slice(0, 120),
          blurb: c.blurb.slice(0, 80),
        })),
        forcedAttachDevelopmentId: forcedAttach,
      },
      null,
      0,
    );

    const t0 = Date.now();
    try {
      const raw = await this.llm.completeJson<LlmAuthorPayload>(system, user);
      const latencyMs = Date.now() - t0;
      const actionRaw = String(raw.action ?? '')
        .trim()
        .toLowerCase();
      let action: GateFinalAction = actionRaw === 'wake' ? 'wake' : 'drop';
      const title = String(raw.title ?? '')
        .trim()
        .slice(0, 300);
      const summary = String(raw.summary ?? '')
        .trim()
        .slice(0, 4000);
      const whyItMatters = String(raw.whyItMatters ?? '')
        .trim()
        .slice(0, 500);
      const watchNext = String(raw.watchNext ?? '')
        .trim()
        .slice(0, 300);
      let reason = String(raw.reason ?? '')
        .trim()
        .slice(0, 500);
      const importanceRaw = String(raw.importance ?? 'medium')
        .trim()
        .toLowerCase();
      const importance =
        importanceRaw === 'critical' || importanceRaw === 'high' ? importanceRaw : 'medium';
      const catalogIds = new Set(catalog.map((c) => c.id));
      let attachDevelopmentId = String(raw.attachDevelopmentId ?? '')
        .trim();
      if (attachDevelopmentId && !catalogIds.has(attachDevelopmentId)) {
        attachDevelopmentId = '';
      }
      if (forcedAttach && catalogIds.has(forcedAttach) && !attachDevelopmentId) {
        attachDevelopmentId = forcedAttach;
      }
      const mergeModeRaw = String(raw.mergeMode ?? '')
        .trim()
        .toLowerCase();
      const mergeMode =
        mergeModeRaw === 'evidence_only' ? 'evidence_only' : 'upsert_text';

      if (action === 'wake' && (!title || !summary)) {
        return {
          action: 'drop',
          importance: 'medium',
          title: '',
          summary: '',
          whyItMatters: '',
          watchNext: '',
          reason: 'wake_missing_title_or_summary',
          latencyMs,
          failed: false,
          attachDevelopmentId: null,
          mergeMode: 'upsert_text',
        };
      }

      const coerced = coerceWakeDropConsistency({ action, title, summary, reason });
      if (coerced.coerced) {
        action = 'drop';
        reason = coerced.reason;
      }

      return {
        action,
        importance,
        title: action === 'wake' ? title : '',
        summary: action === 'wake' ? summary : '',
        whyItMatters: action === 'wake' ? whyItMatters : '',
        watchNext: action === 'wake' ? watchNext : '',
        reason: reason || (action === 'wake' ? 'authored' : 'dropped'),
        latencyMs,
        failed: false,
        attachDevelopmentId: attachDevelopmentId || null,
        mergeMode,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `event=author_llm_fail monitorId=${input.monitorId} feedItemId=${input.feedItemId} err=${msg.slice(0, 160)}`,
      );
      return {
        action: 'drop',
        importance: 'medium',
        title: '',
        summary: '',
        whyItMatters: '',
        watchNext: '',
        reason: `llm_failed:${msg.slice(0, 120)}`,
        latencyMs: Date.now() - t0,
        failed: true,
        attachDevelopmentId: null,
        mergeMode: 'upsert_text',
      };
    }
  }
}
