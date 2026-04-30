import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AggregationPolicy, AggregationPolicySchema } from './schemas/aggregation-policy.schema';
import { AggregationPolicyService } from './aggregation-policy.service';
import { AggregationPolicyController } from './aggregation-policy.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: AggregationPolicy.name, schema: AggregationPolicySchema }])],
  controllers: [AggregationPolicyController],
  providers: [AggregationPolicyService],
  exports: [AggregationPolicyService],
})
export class AggregationPolicyModule {}
