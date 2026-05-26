import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AggregationPolicyService } from './aggregation-policy.service';
import { UpdateAggregationPolicyDto } from './dto/update-aggregation-policy.dto';

@Controller('admin/aggregation-policy')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AggregationPolicyController {
  constructor(private readonly policy: AggregationPolicyService) {}

  @Get()
  get() {
    return this.policy.getForAdmin();
  }

  @Patch()
  patch(@Body() dto: UpdateAggregationPolicyDto) {
    return this.policy.update(dto);
  }
}
