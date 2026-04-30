import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../auth/decorators';
import { SourcesService } from './sources.service';
import { UpdateSourceDto } from './dto/update-source.dto';
import { BatchDeleteSourcesDto } from './dto/batch-delete.dto';
import { ValidateUrlDto } from './dto/validate-url.dto';
import { ListSourcesQueryDto } from './dto/list-sources.query.dto';
import { avatarExtForMime } from './source-avatar.util';
import type { JwtUserRole } from './sources.service';

const SOURCE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

@Controller('sources')
@UseGuards(JwtAuthGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  list(@CurrentUser('userId') userId: string, @Query() query: ListSourcesQueryDto) {
    return this.sourcesService.list(userId, query);
  }

  @Get(':id')
  one(@CurrentUser('userId') userId: string, @CurrentUser('role') role: JwtUserRole | undefined, @Param('id') id: string) {
    return this.sourcesService.getOne(userId, role ?? 'user', id);
  }

  @Post('validate-url')
  @UseGuards(AdminGuard)
  validateUrl(@Body() dto: ValidateUrlDto) {
    return this.sourcesService.validateUrl(dto.url);
  }

  @Post('avatar')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: SOURCE_AVATAR_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (avatarExtForMime(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('invalid_image_type') as Error, false);
      },
    }),
  )
  uploadAvatar(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    return this.sourcesService.saveAvatarBuffer(userId, file.buffer, file.mimetype);
  }

  @Post('batch-delete')
  @UseGuards(AdminGuard)
  batchDelete(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: JwtUserRole | undefined,
    @Body() dto: BatchDeleteSourcesDto,
  ) {
    return this.sourcesService.batchRemove(userId, role ?? 'user', dto.ids);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: JwtUserRole | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSourceDto,
  ) {
    return this.sourcesService.update(userId, role ?? 'user', id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@CurrentUser('userId') userId: string, @CurrentUser('role') role: JwtUserRole | undefined, @Param('id') id: string) {
    return this.sourcesService.remove(userId, role ?? 'user', id);
  }
}
