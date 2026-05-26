import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListDashboardFeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 40;

  /** 未传则默认 168（近 7 日） */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2160)
  recentHours?: number;

  /** 仅返回指定监控下的条目 */
  @IsOptional()
  @IsMongoId()
  monitorId?: string;

  /** 标题 / 摘要 / 信源 / 话题名关键词过滤 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
