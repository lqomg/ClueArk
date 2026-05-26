import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { AdminGuard } from './guards/admin.guard';
import { SourcesService } from '../sources/sources.service';
import { AdminCreateOfficialSourceDto } from './dto/admin-create-official-source.dto';
import { UpdateSourceDto } from '../sources/dto/update-source.dto';

@Controller('admin/sources')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  list(@Query('includeDisabled') includeDisabled?: string) {
    return this.sourcesService.adminList(includeDisabled === '1' || includeDisabled === 'true');
  }

  @Get('export/json')
  exportJson() {
    return this.sourcesService.adminExportJson();
  }

  @Post()
  create(@CurrentUser('userId') adminId: string, @Body() dto: AdminCreateOfficialSourceDto) {
    const { enabled, sortOrder, pollIntervalSec, ...rest } = dto;
    return this.sourcesService.adminCreateOfficial(adminId, {
      ...rest,
      enabled,
      sortOrder,
      pollIntervalSec,
    });
  }

  @Post('import/json')
  importJson(@CurrentUser('userId') adminId: string, @Body() body: unknown) {
    return this.sourcesService.adminImportJson(adminId, body);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.sourcesService.adminGetOne(id);
  }

  @Patch(':id')
  update(@CurrentUser('userId') adminId: string, @Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.adminUpdateAny(adminId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sourcesService.adminSoftDelete(id);
  }
}
