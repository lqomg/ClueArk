import { Body, Controller, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlerIngestGuard } from '../feed-items/guards/crawler-ingest.guard';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { clampPollIntervalSec, pollIntervalBoundsFromConfig } from '../sources/source-poll-interval.util';
import { ConfigService } from '@nestjs/config';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { JobLifecycleService } from './job-lifecycle.service';

@Controller('internal/jobs')
@UseGuards(CrawlerIngestGuard)
export class InternalJobsController {
  constructor(
    private readonly lifecycle: JobLifecycleService,
    private readonly config: ConfigService,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
  ) {}

  @Patch(':jobId/status')
  async updateStatus(@Param('jobId') jobId: string, @Body() body: UpdateJobStatusDto) {
    const doc = await this.lifecycle.updateFromExternal(jobId, body);
    if (!doc) throw new NotFoundException('job_not_found');

    if (body.status === 'completed' && doc.type === 'crawl_web' && doc.sourceId) {
      const src = await this.sourceModel.findById(doc.sourceId).select({ pollIntervalSec: 1 }).exec();
      if (src) {
        const b = pollIntervalBoundsFromConfig((k) => this.config.get(k));
        const intervalSec = clampPollIntervalSec(src.pollIntervalSec ?? undefined, b.min, b.max, b.def);
        const now = new Date();
        const next = new Date(Date.now() + intervalSec * 1000);
        await this.sourceModel
          .updateOne({ _id: src._id }, { $set: { lastPolledAt: now, nextPollAt: next } })
          .exec();
      }
    }

    return { ok: true, jobId: String(doc._id), status: doc.status };
  }
}
