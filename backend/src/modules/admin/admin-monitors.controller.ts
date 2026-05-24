import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { MonitorsAdminService } from './monitors-admin.service';
import { ListAdminMonitorsQueryDto } from './dto/list-admin-monitors.query.dto';

@Controller('admin/monitors')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminMonitorsController {
  constructor(private readonly monitorsAdmin: MonitorsAdminService) {}

  @Get()
  list(@Query() query: ListAdminMonitorsQueryDto) {
    return this.monitorsAdmin.list(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.monitorsAdmin.getOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.monitorsAdmin.softDelete(id);
  }
}
