import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LlmModule } from '../llm/llm.module';
import { DevelopmentsModule } from '../developments/developments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Monitor, MonitorSchema } from '../monitors/schemas/monitor.schema';
import {
  MonitorGateDecision,
  MonitorGateDecisionSchema,
} from './schemas/monitor-gate-decision.schema';
import { AuthorDevelopmentService } from './author-development.service';
import { GateDecisionService } from './gate-decision.service';
import { GateEvaluateService } from './gate-evaluate.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonitorGateDecision.name, schema: MonitorGateDecisionSchema },
      { name: Monitor.name, schema: MonitorSchema },
    ]),
    LlmModule,
    DevelopmentsModule,
    NotificationsModule,
  ],
  providers: [AuthorDevelopmentService, GateDecisionService, GateEvaluateService],
  exports: [GateEvaluateService, GateDecisionService],
})
export class MonitorGateModule {}
