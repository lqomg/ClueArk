import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../logger';
import { UserPreferencesService } from '../users/user-preferences.service';
import { DevelopmentsService } from '../developments/developments.service';
import { DevelopmentsLocalizeJobService } from '../developments/developments-localize-job.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { AuthorDevelopmentService } from './author-development.service';
import { GateDecisionService } from './gate-decision.service';
import { decideAdmission, type AdmissionReason } from './admission.util';
import { resolveAuthorAttachTarget, resolveAuthoredMergeMode } from './author-attach.util';
import { buildEditorEvidencePack, clipDevelopmentBlurb } from './development-evidence-pack.util';
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
    const listed = await this.developments.listCatalogForGate(
      cand.monitorId,
      COLD_START.developmentCatalogCap,
    );
    const sameCluster =
      listed.find(
        (row) =>
          Types.ObjectId.isValid(item.clusterId) && row.mergeScopeKey === item.clusterId,
      ) ?? null;
    const pack = buildEditorEvidencePack({
      listed,
      sameCluster,
      catalogCap: COLD_START.developmentCatalogCap,
      focusRecent: COLD_START.developmentFocusRecent,
      blurbMax: COLD_START.developmentCatalogBlurbMax,
    });

    const excludeTerms = (monitor.entities ?? [])
      .map((e) => String(e ?? '').trim())
      .filter(Boolean);
    const catalogForClaim = pack.catalog.map((c) => {
      const row = pack.rowsById.get(c.id);
      return {
        id: c.id,
        title: c.title,
        summary: row?.summary,
        timelineAtMs: Date.parse(c.timelineAt) || undefined,
      };
    });
    const sameClaimOpts = {
      minSharedTokens: COLD_START.sameClaimMinSharedTokens,
      minTitleJaccard: COLD_START.sameClaimMinTitleJaccard,
      minCoverage: COLD_START.sameClaimMinCoverage,
      excludeTerms,
      windowHours: COLD_START.sameClaimWindowHours,
      probeAtMs: item.publishedAt?.getTime?.() ?? Date.now(),
    };
    const preHit = findSameClaimAttachTarget(item.title, catalogForClaim, sameClaimOpts);

    const authored = await this.author.author({
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
      catalogBlurbs: pack.catalog.map((c) => ({
        id: c.id,
        title: c.title,
        blurb: c.blurb || clipDevelopmentBlurb(pack.rowsById.get(c.id)?.summary ?? '', 80),
      })),
      forcedAttachDevelopmentId: preHit?.id ?? null,
    });

    let developmentId: string | null = null;
    if (authored.action === 'wake') {
      const fallbackScope = Types.ObjectId.isValid(item.clusterId)
        ? item.clusterId
        : item.feedItemId;
      const attachCandidates = [...pack.rowsById.values()].map((r) => ({
        id: r.id,
        mergeScopeKey: r.mergeScopeKey || r.id,
      }));

      let attachId = authored.attachDevelopmentId;
      if (!attachId) {
        const postHit = findSameClaimAttachTarget(
          authored.title,
          catalogForClaim,
          sameClaimOpts,
        );
        if (postHit) attachId = postHit.id;
      }
      if (!attachId && preHit) attachId = preHit.id;

      const resolved = resolveAuthorAttachTarget(attachId, attachCandidates, fallbackScope);
      const mergeMode = resolveAuthoredMergeMode(resolved.attached, authored.mergeMode);
      const quality = computeDevelopmentQualityScores({
        attached: resolved.attached,
        mergeMode,
        importance: authored.importance,
        evidenceCount: 1,
      });

      // evidence_only：开源 upsertByScope 对已有 mergeScopeKey 仅 $setOnInsert 文案 + $addToSet 证据
      // upsert_text 且已挂靠：仍走同一 upsert；若需改写旧卡文案，后续再补 merge 路径
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
        lastMeaningfulAt:
          mergeMode === 'upsert_text' ? item.publishedAt : undefined,
      });
      developmentId = upserted.development.id;

      // 挂靠且 evidence_only 时若已是旧卡，仍通知（新证据到达）
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
        `event=gate_wake monitorId=${cand.monitorId} feedItemId=${item.feedItemId} attached=${resolved.attached} mergeMode=${mergeMode} preSameClaim=${Boolean(preHit)}`,
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
          reasonText: authored.reason,
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
