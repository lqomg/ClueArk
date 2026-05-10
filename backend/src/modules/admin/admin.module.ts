import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SourcesModule } from '../sources/sources.module';
import { AggregationPolicyModule } from '../aggregation-policy/aggregation-policy.module';
import { AdminGuard } from './guards/admin.guard';
import { AdminOrDemoGuard } from './guards/admin-or-demo.guard';
import { AdminSourcesController } from './admin-sources.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [AuthModule, UsersModule, SourcesModule, AggregationPolicyModule],
  controllers: [AdminSourcesController, AdminUsersController],
  providers: [AdminGuard, AdminOrDemoGuard],
})
export class AdminModule {}
