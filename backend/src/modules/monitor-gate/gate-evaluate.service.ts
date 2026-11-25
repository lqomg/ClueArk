import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../logger';
import { UserPreferencesService } from '../users/user-preferences.service';
import { DevelopmentsService } from '../developments/developments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { AuthorDevelopmentService } from './author-development.service';
import { GateDecisionService } from './gate-decision.service';
import { decideAdmission, type AdmissionReason } from './admission.util';
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
    });

    let developmentId: string | null = null;
    if (authored.action === 'wake') {
      const mergeScopeKey = Types.ObjectId.isValid(item.clusterId)
        ? item.clusterId
        : item.feedItemId;
      const upserted = await this.developments.upsertByScope({
        monitorId: cand.monitorId,
        userId,
        title: authored.title,
        summary: authored.summary,
        whyItMatters: authored.whyItMatters,
        watchNext: authored.watchNext,
        severity: importanceToSeverity(authored.importance),
        evidenceItemIds: [item.feedItemId],
        clusterIds: Types.ObjectId.isValid(item.clusterId) ? [item.clusterId] : [],
        primaryEvidenceItemId: item.feedItemId,
        mergeScopeKey,
        occurredAt: item.publishedAt,
        timelineAt: item.publishedAt,
        locale,
        gateDecisionId: null,
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
