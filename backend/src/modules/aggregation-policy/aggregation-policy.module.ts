import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AggregationPolicy, AggregationPolicySchema } from './schemas/aggregation-policy.schema';
import { AggregationPolicyService } from './aggregation-policy.service';
import { AggregationPolicyController } from './aggregation-policy.controller';
import { AdminOrDemoGuard } from '../admin/guards/admin-or-demo.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: AggregationPolicy.name, schema: AggregationPolicySchema }])],
  controllers: [AggregationPolicyController],
  providers: [AggregationPolicyService, AdminOrDemoGuard, AdminGuard],
  exports: [AggregationPolicyService],
})
export class AggregationPolicyModule {}
