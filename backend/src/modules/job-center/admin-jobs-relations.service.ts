import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import type { JobRelationLabels } from './admin-jobs.presenter';

@Injectable()
export class AdminJobsRelationsService {
  constructor(
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
  ) {}

  async resolveForJobs(
    jobs: Array<{ sourceId?: Types.ObjectId | null; monitorId?: Types.ObjectId | null }>,
  ): Promise<Map<string, JobRelationLabels>> {
    const sourceIds = new Set<string>();
    const monitorIds = new Set<string>();
    for (const j of jobs) {
      if (j.sourceId) sourceIds.add(String(j.sourceId));
      if (j.monitorId) monitorIds.add(String(j.monitorId));
    }

    const [sources, monitors] = await Promise.all([
      sourceIds.size
        ? this.sourceModel
            .find({
              _id: {
                $in: [...sourceIds]
                  .filter((id) => Types.ObjectId.isValid(id))
                  .map((id) => new Types.ObjectId(id)),
              },
            })
            .select({ displayName: 1, kind: 1 })
            .lean()
            .exec()
        : [],
      monitorIds.size
        ? this.monitorModel
            .find({
              _id: {
                $in: [...monitorIds]
                  .filter((id) => Types.ObjectId.isValid(id))
                  .map((id) => new Types.ObjectId(id)),
              },
            })
            .select({ title: 1 })
            .lean()
            .exec()
        : [],
    ]);

    const sourceById = new Map<string, Pick<JobRelationLabels, 'sourceName' | 'sourceKind'>>();
    for (const s of sources) {
      sourceById.set(String(s._id), {
        sourceName: s.displayName?.trim() || null,
        sourceKind: s.kind ?? null,
      });
    }
    const monitorById = new Map<string, Pick<JobRelationLabels, 'monitorTitle'>>();
    for (const m of monitors) {
      monitorById.set(String(m._id), { monitorTitle: m.title?.trim() || null });
    }

    const out = new Map<string, JobRelationLabels>();
    for (const j of jobs) {
      const key = `${j.sourceId ?? ''}:${j.monitorId ?? ''}`;
      if (out.has(key)) continue;
      const rel: JobRelationLabels = {};
      if (j.sourceId) Object.assign(rel, sourceById.get(String(j.sourceId)) ?? {});
      if (j.monitorId) Object.assign(rel, monitorById.get(String(j.monitorId)) ?? {});
      out.set(key, rel);
    }
    return out;
  }

  relationsForJob(
    j: { sourceId?: Types.ObjectId | null; monitorId?: Types.ObjectId | null },
    cache: Map<string, JobRelationLabels>,
  ): JobRelationLabels {
    const key = `${j.sourceId ?? ''}:${j.monitorId ?? ''}`;
    return cache.get(key) ?? {};
  }

  async resolveOne(
    j: { sourceId?: Types.ObjectId | null; monitorId?: Types.ObjectId | null },
  ): Promise<JobRelationLabels> {
    const cache = await this.resolveForJobs([j]);
    return this.relationsForJob(j, cache);
  }
}
