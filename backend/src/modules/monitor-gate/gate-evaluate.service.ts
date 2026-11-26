import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../logger';
import { UserPreferencesService } from '../users/user-preferences.service';
import { DevelopmentsService } from '../developments/developments.service';
import { DevelopmentsLocalizeJobService } from '../developments/developments-localize-job.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import {
  AuthorDevelopmentService,
  type AuthorDevelopmentResult,
  FALLBACK_CRITERIA_PROMPT,
} from './author-development.service';
import { GateDecisionService } from './gate-decision.service';
import { decideAdmission, type AdmissionReason } from './admission.util';
import {
  resolveAuthorAttachTarget,
  resolveAuthoredMergeMode,
  type AuthorAttachSource,
} from './author-attach.util';
import { buildEditorEvidencePack } from './development-evidence-pack.util';
import { computeDevelopmentQualityScores } from './development-quality-score.util';
import { findSameClaimAttachTarget } from './same-claim-attach.util';
import { COLD_START } from './cold-start.defaults';
import type { DevelopmentSeverity } from '../developments/schemas/monitor-development.schema';

export type GateEvaluateCandidate = {
  monitorId: string;
  score: number;
  minCosine: unknown;
};

export type GateEvaluateItemInput = {
  feedItemId: string;
  sourceId: string;
  clusterId: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: Date;
  candidates: GateEvaluateCandidate[];
};

function importanceToSeverity(
  importance: 'critical' | 'high' | 'medium',
): DevelopmentSeverity {
  if (importance === 'critical') return 'critical';
  if (importance === 'high') return 'high';
  return 'medium';
}

@Injectable()
export class GateEvaluateService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    private readonly author: AuthorDevelopmentService,
    private readonly decisions: GateDecisionService,
    private readonly developments: DevelopmentsService,
    private readonly localizeJob: DevelopmentsLocalizeJobService,
    private readonly notifications: NotificationsService,
    private readonly userPreferences: UserPreferencesService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(GateEvaluateService.name);
  }

  async evaluateItem(input: GateEvaluateItemInput): Promise<{
    evaluated: number;
    woken: number;
    dropped: number;
    wokenMonitorIds: string[];
  }> {
    let evaluated = 0;
    let woken = 0;
    let dropped = 0;
    const wokenMonitorIds: string[] = [];

    for (const cand of input.candidates) {
      const result = await this.evaluateCandidate(input, cand);
      if (!result) continue;
      evaluated += 1;
      if (result === 'wake') {
        woken += 1;
        wokenMonitorIds.push(cand.monitorId);
      } else {
        dropped += 1;
      }
    }

    this.logger.debug(
      `event=gate_eval_done feedItemId=${input.feedItemId} evaluated=${evaluated} woken=${woken} dropped=${dropped}`,
    );
    return { evaluated, woken, dropped, wokenMonitorIds };
  }

  private async evaluateCandidate(
    item: GateEvaluateItemInput,
    cand: GateEvaluateCandidate,
  ): Promise<'wake' | 'drop' | null> {
    if (!Types.ObjectId.isValid(cand.monitorId)) return null;
    const monitor = await this.monitorModel
      .findOne({
        _id: new Types.ObjectId(cand.monitorId),
        deletedAt: null,
        createStatus: { $ne: 'failed' },
      })
      .select({
        userId: 1,
        title: 1,
        description: 1,
        topicPrompt: 1,
        entities: 1,
        minCosine: 1,
        sourceIds: 1,
      })
      .lean()
      .exec();
    if (!monitor) return null;

    const sourceBound = (monitor.sourceIds ?? []).some(
      (sid) => String(sid) === item.sourceId,
    );
    if (!sourceBound) {
      this.logger.debug(
        `event=gate_skip monitorId=${cand.monitorId} feedItemId=${item.feedItemId} reason=source_not_bound`,
      );
      return null;
    }

    const admission = decideAdmission({
      minCosine: monitor.minCosine ?? cand.minCosine,
      title: item.title,
      summary: item.summary,
      entities: monitor.entities ?? [],
      precomputedSemanticScore: cand.score,
    });

    const userId = String(monitor.userId);
    if (admission.admitted === false) {
      const missReason = admission.reason;
      await this.decisions.record({
        monitorId: cand.monitorId,
        userId,
        feedItemId: item.feedItemId,
        sourceId: item.sourceId,
        clusterId: item.clusterId,
        finalAction: 'drop',
        stages: [
          {
            stage: 'admission',
            action: 'drop',
            reasonCode: missReason,
            reasonText: missReason,
            score: admission.semanticScore,
          },
        ],
        itemTitle: item.title,
        itemPublishedAt: item.publishedAt,
        admissionOutcome: 'missed',
      });
      return 'drop';
    }

    const locale = await this.userPreferences.getLocaleOrDefault(userId);
    const criteria =
      String(monitor.topicPrompt ?? '').trim() ||
      String(monitor.description ?? '').trim() ||
      FALLBACK_CRITERIA_PROMPT;

    const listed = await this.developments.listCatalogForGate(
      cand.monitorId,
      COLD_START.developmentCatalogCap,
    );
    const fallbackScope = Types.ObjectId.isValid(item.clusterId)
      ? item.clusterId
      : item.feedItemId;
    const sameCluster =
      listed.find((row) => row.mergeScopeKey === fallbackScope) ?? null;
    const pack = buildEditorEvidencePack({
      listed,
      sameCluster,
      catalogCap: COLD_START.developmentCatalogCap,
      focusRecent: COLD_START.developmentFocusRecent,
      blurbMax: COLD_START.developmentCatalogBlurbMax,
    });
    const attachTargets = pack.catalog
      .map((card) => pack.rowsById.get(card.id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row?.id && row.mergeScopeKey))
      .map((row) => ({
        id: row.id,
        mergeScopeKey: row.mergeScopeKey,
        title: row.title,
        summary: row.summary,
        timelineAt: row.timelineAt,
      }));

    let decidedAttachId: string | null = null;
    let attachSource: AuthorAttachSource = 'none';
    let attachFallbackReason = '';

    const excludeTerms = (monitor.entities ?? [])
      .map((e) => String(e ?? '').trim())
      .filter(Boolean);
    const sameClaimOpts = {
      minSharedTokens: COLD_START.sameClaimMinSharedTokens,
      minTitleJaccard: COLD_START.sameClaimMinTitleJaccard,
      minCoverage: COLD_START.sameClaimMinCoverage,
      excludeTerms,
      windowHours: COLD_START.sameClaimWindowHours,
      probeAtMs: item.publishedAt?.getTime?.() ?? Date.now(),
    };
    const catalogForClaim = attachTargets.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      timelineAtMs: Date.parse(String(row.timelineAt ?? '')) || 0,
    }));

    if (sameCluster) {
      decidedAttachId = sameCluster.id;
      attachSource = 'hard';
      this.logger.debug(
        `event=attach_development_skip monitorId=${cand.monitorId} feedItemId=${item.feedItemId} source=hard attach=${decidedAttachId}`,
      );
    } else {
      const nearDup = findSameClaimAttachTarget(item.title, catalogForClaim, sameClaimOpts);
      if (nearDup) {
        decidedAttachId = nearDup.id;
        attachSource = 'near_dup';
        this.logger.debug(
          `event=attach_development_near_dup monitorId=${cand.monitorId} feedItemId=${item.feedItemId} attach=${decidedAttachId} jaccard=${nearDup.jaccard.toFixed(3)}`,
        );
      } else if (pack.catalog.length) {
        const chosen = await this.author.chooseAttach({
          monitorId: cand.monitorId,
          feedItemId: item.feedItemId,
          monitorTitle: String(monitor.title ?? ''),
          topicPrompt: String(monitor.topicPrompt ?? ''),
          description: String(monitor.description ?? ''),
          title: item.title,
          summary: item.summary,
          quote: admission.quote,
          catalog: pack.catalog,
          focus: pack.focus,
        });
        if (!chosen.ok) {
          attachFallbackReason = chosen.reason;
          decidedAttachId = null;
          attachSource = 'none';
          this.logger.warn(
            `event=attach_invalid_fallback_create monitorId=${cand.monitorId} feedItemId=${item.feedItemId} reason=${chosen.reason}`,
          );
        } else {
          decidedAttachId = chosen.attachDevelopmentId;
          attachSource = decidedAttachId ? 'llm' : 'none';
          this.logger.debug(
            `event=attach_development_chosen monitorId=${cand.monitorId} feedItemId=${item.feedItemId} attach=${decidedAttachId ?? ''} source=llm`,
          );
        }
      }
    }

    let existingAttached: { title: string; summary: string } | null = null;
    if (decidedAttachId) {
      const fromPack = pack.rowsById.get(decidedAttachId);
      const packedTitle = String(fromPack?.title ?? '').trim();
      const packedSummary = String(fromPack?.summary ?? '').trim();
      if (packedTitle && packedSummary) {
        existingAttached = { title: packedTitle, summary: packedSummary };
      } else {
        const fetched = await this.developments.getOne(cand.monitorId, decidedAttachId);
        const title = String(fetched?.title ?? '').trim();
        const summary = String(fetched?.summary ?? '').trim();
        if (title && summary) existingAttached = { title, summary };
      }
    }

    let authoredFromDelta: AuthorDevelopmentResult | null = null;
    let deltaDecidedUpsertText = false;
    let deltaReasonPrefix = '';
    let deltaDetachHandoff: {
      reason: string;
      detachedFrom: { title: string; summary: string } | null;
    } | null = null;

    if (decidedAttachId && existingAttached) {
      const delta = await this.author.judgeDelta({
        monitorId: cand.monitorId,
        feedItemId: item.feedItemId,
        existing: existingAttached,
        title: item.title,
        summary: item.summary,
        quote: admission.quote,
        criteria,
      });
      this.logger.debug(
        `event=development_delta monitorId=${cand.monitorId} feedItemId=${item.feedItemId} attach=${decidedAttachId} mergeMode=${delta.mergeMode} hasNew=${delta.hasNewVerifiableFact} failed=${delta.failed}`,
      );

      if (delta.failed) {
        await this.decisions.record({
          monitorId: cand.monitorId,
          userId,
          feedItemId: item.feedItemId,
          sourceId: item.sourceId,
          clusterId: item.clusterId,
          finalAction: 'drop',
          stages: [
            {
              stage: 'admission',
              action: 'admit',
              reasonCode: admission.reasons.join(','),
              reasonText: admission.reasons.join(','),
              score: admission.semanticScore,
            },
            {
              stage: 'llm',
              action: 'drop',
              reasonCode: 'llm_failed',
              reasonText: attachFallbackReason
                ? `${delta.reason} [attach_invalid_fallback_create:${attachFallbackReason}]`
                : delta.reason,
              score: admission.semanticScore,
            },
          ],
          llm: {
            action: 'drop',
            reason: delta.reason,
            latencyMs: delta.latencyMs,
            failed: true,
          },
          itemTitle: item.title,
          itemPublishedAt: item.publishedAt,
          admissionOutcome: 'admitted',
        });
        return 'drop';
      }

      if (delta.mergeMode === 'drop' && delta.hasNewVerifiableFact === true) {
        const detachedFrom = decidedAttachId;
        deltaDetachHandoff = {
          reason: delta.reason,
          detachedFrom: {
            title: existingAttached.title,
            summary: existingAttached.summary,
          },
        };
        this.logger.debug(
          `event=development_delta_detach monitorId=${cand.monitorId} feedItemId=${item.feedItemId} detachedFrom=${detachedFrom}`,
        );
        decidedAttachId = null;
        existingAttached = null;
        attachSource = 'delta_detach';
        deltaReasonPrefix = '[delta_detach_then_create] ';
      } else if (delta.mergeMode === 'drop') {
        await this.decisions.record({
          monitorId: cand.monitorId,
          userId,
          feedItemId: item.feedItemId,
          sourceId: item.sourceId,
          clusterId: item.clusterId,
          finalAction: 'drop',
          stages: [
            {
              stage: 'admission',
              action: 'admit',
              reasonCode: admission.reasons.join(','),
              reasonText: admission.reasons.join(','),
              score: admission.semanticScore,
            },
            {
              stage: 'llm',
              action: 'drop',
              reasonCode: 'delta_drop',
              reasonText: attachFallbackReason
                ? `${delta.reason} [attach_invalid_fallback_create:${attachFallbackReason}]`
                : delta.reason,
              score: admission.semanticScore,
            },
          ],
          llm: {
            action: 'drop',
            reason: delta.reason,
            latencyMs: delta.latencyMs,
            failed: false,
          },
          itemTitle: item.title,
          itemPublishedAt: item.publishedAt,
          admissionOutcome: 'admitted',
        });
        return 'drop';
      } else if (delta.mergeMode === 'evidence_only') {
        authoredFromDelta = {
          action: 'wake',
          importance: 'medium',
          title: existingAttached.title,
          summary: existingAttached.summary,
          whyItMatters: '',
          watchNext: '',
          mergeMode: 'evidence_only',
          attachDevelopmentId: decidedAttachId,
          reason: delta.reason,
          latencyMs: delta.latencyMs,
          failed: false,
        };
      } else {
        deltaDecidedUpsertText = true;
        deltaReasonPrefix = '[delta:upsert_text] ';
      }
    }

    const authored =
      authoredFromDelta ??
      (await this.author.author({
        monitorId: cand.monitorId,
        feedItemId: item.feedItemId,
        monitorTitle: String(monitor.title ?? ''),
        topicPrompt: String(monitor.topicPrompt ?? ''),
        description: String(monitor.description ?? ''),
        title: item.title,
        summary: item.summary,
        quote: admission.quote,
        admissionReasons: admission.reasons as AdmissionReason[],
        semanticScore: admission.semanticScore,
        locale,
        catalog: pack.catalog,
        focus: pack.focus,
        decidedAttachDevelopmentId: decidedAttachId,
        existingAttached,
        deltaDecidedUpsertText,
        deltaDetachHandoff,
      }));

    if (deltaReasonPrefix && authored.reason) {
      authored.reason = `${deltaReasonPrefix}${authored.reason}`;
    }

    let developmentId: string | null = null;
    if (authored.action === 'wake') {
      // 成稿后再做一次同主张校验（仅 create 路径）
      let attachId = authored.attachDevelopmentId ?? decidedAttachId;
      if (!attachId && attachSource !== 'delta_detach') {
        const postHit = findSameClaimAttachTarget(
          authored.title,
          catalogForClaim,
          sameClaimOpts,
        );
        if (postHit) {
          attachId = postHit.id;
          attachSource = 'same_claim_post';
        }
      }

      const attachCandidates = attachTargets.map((r) => ({
        id: r.id,
        mergeScopeKey: r.mergeScopeKey || r.id,
      }));
      const resolved = resolveAuthorAttachTarget(attachId, attachCandidates, fallbackScope);
      const mergeMode = resolveAuthoredMergeMode(resolved.attached, authored.mergeMode);
      const quality = computeDevelopmentQualityScores({
        attached: resolved.attached,
        mergeMode,
        importance: authored.importance,
        evidenceCount: 1,
      });

      const upserted = await this.developments.upsertByScope({
        monitorId: cand.monitorId,
        userId,
        title: authored.title,
        summary: authored.summary,
        whyItMatters: authored.whyItMatters,
        watchNext: authored.watchNext,
        severity: importanceToSeverity(authored.importance),
        noveltyScore: quality.noveltyScore,
        confidence: quality.confidence,
        evidenceItemIds: [item.feedItemId],
        clusterIds: Types.ObjectId.isValid(item.clusterId) ? [item.clusterId] : [],
        primaryEvidenceItemId: item.feedItemId,
        mergeScopeKey: resolved.mergeScopeKey,
        occurredAt: item.publishedAt,
        timelineAt: item.publishedAt,
        locale,
        gateDecisionId: null,
        mergeMode,
        lastMeaningfulAt: mergeMode === 'upsert_text' ? item.publishedAt : undefined,
      });
      developmentId = upserted.development.id;

      await this.notifications.createFromMatch({
        userId,
        monitorId: cand.monitorId,
        feedItemId: item.feedItemId,
        clusterId: item.clusterId,
        score: cand.score,
        title: authored.title || item.title,
        link: item.link,
        monitorTitle: String(monitor.title ?? ''),
      });

      void this.localizeJob
        .enqueueForDevelopment({
          monitorId: cand.monitorId,
          developmentId: upserted.development.id,
          title: upserted.development.title,
          summary: upserted.development.summary,
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `event=gate_localize_enqueue_fail monitorId=${cand.monitorId} err=${msg.slice(0, 120)}`,
          );
        });

      this.logger.debug(
        `event=gate_wake monitorId=${cand.monitorId} feedItemId=${item.feedItemId} attached=${resolved.attached} mergeMode=${mergeMode} attachSource=${attachSource}`,
      );
    }

    await this.decisions.record({
      monitorId: cand.monitorId,
      userId,
      feedItemId: item.feedItemId,
      sourceId: item.sourceId,
      clusterId: item.clusterId,
      finalAction: authored.action,
      stages: [
        {
          stage: 'admission',
          action: 'admit',
          reasonCode: admission.reasons.join(','),
          reasonText: admission.reasons.join(','),
          score: admission.semanticScore,
        },
        {
          stage: 'llm',
          action: authored.action,
          reasonCode: authored.failed ? 'llm_failed' : authored.reason.slice(0, 64),
          reasonText: attachFallbackReason
            ? `${authored.reason} [attach_invalid_fallback_create:${attachFallbackReason}]`
            : authored.reason,
          score: admission.semanticScore,
        },
      ],
      developmentId,
      llm: {
        action: authored.action,
        reason: authored.reason,
        latencyMs: authored.latencyMs,
        failed: authored.failed,
      },
      itemTitle: item.title,
      itemPublishedAt: item.publishedAt,
      admissionOutcome: 'admitted',
    });

    return authored.action;
  }
}
