import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export type HomeFeedTab = 'subscribed' | 'recommended';

export const HOME_FEED_RECENT_HOURS_MAX = 2160;
export const HOME_FEED_RECENT_HOURS_DEFAULT = 720;
export const HOME_FEED_PAGE_LIMIT_DEFAULT = 20;
export const HOME_FEED_PAGE_LIMIT_MAX = 50;

export class HomeFeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HOME_FEED_RECENT_HOURS_MAX)
  recentHours?: number = HOME_FEED_RECENT_HOURS_DEFAULT;

  /** subscribed = 自建专题；recommended = 精选（开源暂空） */
  @IsOptional()
  @IsIn(['subscribed', 'recommended'])
  tab?: HomeFeedTab = 'subscribed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HOME_FEED_PAGE_LIMIT_MAX)
  limit?: number = HOME_FEED_PAGE_LIMIT_DEFAULT;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  cursor?: string;
}
