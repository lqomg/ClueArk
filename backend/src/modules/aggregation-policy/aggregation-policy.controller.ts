import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOrDemoGuard } from '../admin/guards/admin-or-demo.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AggregationPolicyService } from './aggregation-policy.service';
import { UpdateAggregationPolicyDto } from './dto/update-aggregation-policy.dto';

@Controller('admin/aggregation-policy')
@UseGuards(JwtAuthGuard, AdminOrDemoGuard)
export class AggregationPolicyController {
  constructor(private readonly policy: AggregationPolicyService) {}

  @Get()
  get() {
    return this.policy.getForAdmin();
  }

  @Patch()
  @UseGuards(AdminGuard)
  patch(@Body() dto: UpdateAggregationPolicyDto) {
    return this.policy.update(dto);
  }
}
