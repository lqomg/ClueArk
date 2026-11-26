import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../logger';
import {
  MonitorGateDecision,
  MonitorGateDecisionDocument,
  type GateFinalAction,
  type GateStageName,
} from './schemas/monitor-gate-decision.schema';

const TTL_MS = 90 * 24 * 3600_000;

export type GateDecisionStageInput = {
  stage: GateStageName;
  action: string;
  reasonCode?: string;
  reasonText?: string;
  score?: number | null;
};

export type RecordGateDecisionInput = {
  monitorId: string;
  userId: string;
  feedItemId: string;
  sourceId: string;
  clusterId?: string | null;
  finalAction: GateFinalAction;
  stages: GateDecisionStageInput[];
  developmentId?: string | null;
  llm?: {
    action?: string;
    reason?: string;
    latencyMs?: number | null;
    failed?: boolean;
  } | null;
  itemTitle?: string;
  itemPublishedAt?: Date | null;
  admissionOutcome?: 'admitted' | 'missed' | null;
};

@Injectable()
export class GateDecisionService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(MonitorGateDecision.name)
    private readonly model: Model<MonitorGateDecisionDocument>,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(GateDecisionService.name);
  }

  async record(input: RecordGateDecisionInput): Promise<string | null> {
    if (
      !Types.ObjectId.isValid(input.monitorId) ||
      !Types.ObjectId.isValid(input.userId) ||
      !Types.ObjectId.isValid(input.feedItemId) ||
      !Types.ObjectId.isValid(input.sourceId)
    ) {
      return null;
    }
    const now = new Date();
    const expireAt = new Date(now.getTime() + TTL_MS);
    const clusterId =
      input.clusterId && Types.ObjectId.isValid(input.clusterId)
        ? new Types.ObjectId(input.clusterId)
        : null;
    const developmentId =
      input.developmentId && Types.ObjectId.isValid(input.developmentId)
        ? new Types.ObjectId(input.developmentId)
        : null;
    try {
      const doc = await this.model
        .findOneAndUpdate(
          {
            monitorId: new Types.ObjectId(input.monitorId),
            feedItemId: new Types.ObjectId(input.feedItemId),
          },
          {
            $set: {
              userId: new Types.ObjectId(input.userId),
              sourceId: new Types.ObjectId(input.sourceId),
              clusterId,
              finalAction: input.finalAction,
              stages: input.stages.map((s) => ({
                stage: s.stage,
                action: String(s.action ?? '').slice(0, 32),
                reasonCode: String(s.reasonCode ?? '').slice(0, 64),
                reasonText: String(s.reasonText ?? '').slice(0, 500),
                score:
                  typeof s.score === 'number' && Number.isFinite(s.score) ? s.score : null,
              })),
              developmentId,
              llm: input.llm
                ? {
                    action: String(input.llm.action ?? '').slice(0, 16),
                    reason: String(input.llm.reason ?? '').slice(0, 500),
                    latencyMs:
                      typeof input.llm.latencyMs === 'number' &&
                      Number.isFinite(input.llm.latencyMs)
                        ? input.llm.latencyMs
                        : null,
                    failed: Boolean(input.llm.failed),
                  }
                : null,
              itemTitle: String(input.itemTitle ?? '').slice(0, 300),
              itemPublishedAt: input.itemPublishedAt ?? null,
              admissionOutcome: input.admissionOutcome ?? null,
              expireAt,
            },
            $setOnInsert: {
              monitorId: new Types.ObjectId(input.monitorId),
              feedItemId: new Types.ObjectId(input.feedItemId),
            },
          },
          { upsert: true, new: true },
        )
        .exec();
      return doc?._id ? String(doc._id) : null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `event=gate_decision_record_fail monitorId=${input.monitorId} feedItemId=${input.feedItemId} err=${msg.slice(0, 160)}`,
      );
      return null;
    }
  }
}
