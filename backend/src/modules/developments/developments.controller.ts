import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { MonitorsService } from '../monitors/monitors.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { normalizeLocale } from '../../common/utils/locale.utils';
import { DevelopmentsService } from './developments.service';
import { DevelopmentsReadLocalizationService } from './developments-read-localization.service';
import { ListDevelopmentsQueryDto } from './dto/list-developments.query.dto';

@Controller('monitors/:monitorId/developments')
@UseGuards(JwtAuthGuard)
export class DevelopmentsController {
  constructor(
    private readonly developments: DevelopmentsService,
    private readonly localization: DevelopmentsReadLocalizationService,
    private readonly monitors: MonitorsService,
    private readonly userPreferences: UserPreferencesService,
  ) {}

  private async viewerLocale(
    userId: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<string> {
    const headerRaw = headers['x-lang'] ?? headers['lang'];
    const fromHeader = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    if (fromHeader?.trim()) return normalizeLocale(fromHeader);
    return this.userPreferences.getLocaleOrDefault(userId);
  }

  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @Param('monitorId') monitorId: string,
    @Query() query: ListDevelopmentsQueryDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await this.monitors.getOne(monitorId, userId);
    const locale = await this.viewerLocale(userId, headers);
    const result = await this.developments.listForMonitor(monitorId, {
      page: query.page,
      pageSize: query.pageSize,
      recentHours: query.recentHours,
      sort: query.sort,
    });
    const items = await this.localization.localizeDevelopments(result.items, locale);
    return { ...result, items };
  }

  @Get(':developmentId')
  async getOne(
    @CurrentUser('userId') userId: string,
    @Param('monitorId') monitorId: string,
    @Param('developmentId') developmentId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await this.monitors.getOne(monitorId, userId);
    const locale = await this.viewerLocale(userId, headers);
    const item = await this.developments.getOneOrThrow(monitorId, developmentId);
    const [localized] = await this.localization.localizeDevelopments([item], locale);
    return localized;
  }
}
