import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Source, SourceDocument } from '../sources/schemas/source.schema';

@Injectable()
export class MonitoredSourcesService {
  constructor(@InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>) {}

  async applyMonitorSourceDiff(prevIds: string[], nextIds: string[]): Promise<void> {
    const prev = new Set(prevIds.map(String));
    const next = new Set(nextIds.map(String));
    const inc: string[] = [];
    const dec: string[] = [];
    for (const id of next) {
      if (!prev.has(id)) inc.push(id);
    }
    for (const id of prev) {
      if (!next.has(id)) dec.push(id);
    }
    if (inc.length) {
      await this.sourceModel
        .updateMany(
          { _id: { $in: inc.map((id) => new Types.ObjectId(id)) } },
          { $inc: { monitoredByCount: 1 } },
        )
        .exec();
    }
    if (dec.length) {
      await this.sourceModel
        .updateMany(
          { _id: { $in: dec.map((id) => new Types.ObjectId(id)) } },
          { $inc: { monitoredByCount: -1 } },
        )
        .exec();
    }
    await this.sourceModel
      .updateMany({ monitoredByCount: { $lt: 0 } }, { $set: { monitoredByCount: 0 } })
      .exec();
  }

  async isSourceMonitored(sourceId: string): Promise<boolean> {
    const row = await this.sourceModel.findById(sourceId).select({ monitoredByCount: 1 }).lean().exec();
    return (row?.monitoredByCount ?? 0) > 0;
  }
}
