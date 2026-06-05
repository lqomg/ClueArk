import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Monitor, MonitorSchema } from './schemas/monitor.schema';
import { MonitorLocaleBriefService } from './monitor-locale-brief.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Monitor.name, schema: MonitorSchema }])],
  providers: [MonitorLocaleBriefService],
  exports: [MonitorLocaleBriefService],
})
export class MonitorLocaleBriefModule {}
