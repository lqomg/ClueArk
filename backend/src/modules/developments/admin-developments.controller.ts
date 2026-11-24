import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { DevelopmentsService } from './developments.service';
import { ListAdminDevelopmentsQueryDto } from './dto/list-admin-developments.query.dto';

@Controller('admin/developments')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDevelopmentsController {
  constructor(private readonly developments: DevelopmentsService) {}

  @Get()
  list(@Query() query: ListAdminDevelopmentsQueryDto) {
    return this.developments.listForAdmin({
      page: query.page,
      pageSize: query.pageSize,
      monitorId: query.monitorId,
      userId: query.userId,
      search: query.search,
    });
  }
}
