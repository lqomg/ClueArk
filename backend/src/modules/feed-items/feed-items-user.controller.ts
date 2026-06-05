import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedItemTranslationService } from './feed-item-translation.service';

/** 用户按需翻译条目（物化缓存，禁止 ingest/embed 路径调用） */
@Controller('feed-items')
@UseGuards(JwtAuthGuard)
export class FeedItemsUserController {
  constructor(private readonly translationService: FeedItemTranslationService) {}

  @Get(':id/translation')
  getTranslation(@Param('id') id: string, @Query('locale') locale?: string) {
    return this.translationService.getTranslation(id, locale);
  }
}
