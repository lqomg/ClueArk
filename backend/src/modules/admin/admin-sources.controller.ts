import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { AdminOrDemoGuard } from './guards/admin-or-demo.guard';
import { AdminGuard } from './guards/admin.guard';
import { SourcesService } from '../sources/sources.service';
import { AdminCreateOfficialSourceDto } from './dto/admin-create-official-source.dto';
import { UpdateSourceDto } from '../sources/dto/update-source.dto';

@Controller('admin/sources')
@UseGuards(JwtAuthGuard, AdminOrDemoGuard)
export class AdminSourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  list(@Query('includeDisabled') includeDisabled?: string) {
    return this.sourcesService.adminList(includeDisabled === '1' || includeDisabled === 'true');
  }

  @Get('export/json')
  @UseGuards(AdminGuard)
  exportJson() {
    return this.sourcesService.adminExportJson();
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@CurrentUser('userId') adminId: string, @Body() dto: AdminCreateOfficialSourceDto) {
    const { enabled, sortOrder, ...rest } = dto;
    return this.sourcesService.adminCreateOfficial(adminId, {
      ...rest,
      enabled,
      sortOrder,
    });
  }

  @Post('import/json')
  @UseGuards(AdminGuard)
  importJson(@CurrentUser('userId') adminId: string, @Body() body: unknown) {
    return this.sourcesService.adminImportJson(adminId, body);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.sourcesService.adminGetOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@CurrentUser('userId') adminId: string, @Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.adminUpdateAny(adminId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.sourcesService.adminSoftDelete(id);
  }
}
