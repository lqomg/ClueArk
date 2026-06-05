import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { resolveBriefProfiles } from './brief-profiles';
import { Monitor, MonitorDocument } from './schemas/monitor.schema';

/** 用户 locale 变更后为名下监控入队 brief；独立于 MonitorsService，供 Users 模块调用。 */
@Injectable()
export class MonitorLocaleBriefService {
  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    private readonly preferences: UserPreferencesService,
    private readonly scheduler: JobSchedulerService,
    private readonly config: ConfigService,
  ) {}

  async enqueueBriefRunsForUser(userId: string): Promise<void> {
    const profiles = resolveBriefProfiles(this.config).filter((p) => p.enabled);
    const locale = await this.preferences.getLocaleOrDefault(userId);
    const rows = await this.monitorModel
      .find({ userId: new Types.ObjectId(userId), deletedAt: null })
      .select({ _id: 1 })
      .lean()
      .exec();
    for (const r of rows) {
      const monitorId = String(r._id);
      for (const profile of profiles) {
        await this.scheduler.enqueueRunBrief(monitorId, profile.profileId, {
          trigger: 'api',
          locale,
          uniqueSuffix: `locale:${locale}`,
        });
      }
    }
  }
}
