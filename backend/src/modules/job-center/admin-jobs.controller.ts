import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AdminJobsRelationsService } from './admin-jobs-relations.service';
import { toAdminJobDto } from './admin-jobs.presenter';
import { Job, JobDocument } from './schemas/job.schema';
import { ListJobsQueryDto } from './dto/list-jobs.query.dto';

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminJobsController {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly relations: AdminJobsRelationsService,
  ) {}

  @Get()
  async list(@Query() q: ListJobsQueryDto) {
    const filter: Record<string, unknown> = {};
    if (q.type) filter.type = q.type;
    if (q.status) filter.status = q.status;
    if (q.monitorId && Types.ObjectId.isValid(q.monitorId)) {
      filter.monitorId = new Types.ObjectId(q.monitorId);
    }
    if (q.sourceId && Types.ObjectId.isValid(q.sourceId)) {
      filter.sourceId = new Types.ObjectId(q.sourceId);
    }
    if (q.feedItemId && Types.ObjectId.isValid(q.feedItemId)) {
      filter.feedItemId = new Types.ObjectId(q.feedItemId);
    }
    if (q.from || q.to) {
      const createdAt: Record<string, Date> = {};
      if (q.from) {
        const d = new Date(q.from);
        if (!Number.isNaN(d.getTime())) createdAt.$gte = d;
      }
      if (q.to) {
        const d = new Date(q.to);
        if (!Number.isNaN(d.getTime())) createdAt.$lte = d;
      }
      if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    }

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.jobModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean().exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const relCache = await this.relations.resolveForJobs(items);

    return {
      items: items.map((j) =>
        toAdminJobDto(j, this.relations.relationsForJob(j, relCache)),
      ),
      total,
      page,
      pageSize,
    };
  }

  @Get('stats')
  async stats(@Query('hours') hours?: string) {
    const h = hours != null && hours !== '' ? Number(hours) : 24;
    const windowHours = Number.isFinite(h) && h > 0 && h <= 168 ? h : 24;
    const since = new Date(Date.now() - windowHours * 3600000);
    const rows = await this.jobModel
      .aggregate<{ _id: { type: string; status: string }; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
      ])
      .exec();
    return { windowHours, since: since.toISOString(), buckets: rows };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('job_not_found');
    const j = await this.jobModel.findById(id).lean().exec();
    if (!j) throw new NotFoundException('job_not_found');
    const rel = await this.relations.resolveOne(j);
    const payload =
      j.payload && typeof j.payload === 'object'
        ? (j.payload as Record<string, unknown>)
        : null;
    return toAdminJobDto(j, rel, {
      payload,
      bullJobId: j.bullJobId ?? null,
    });
  }
}
