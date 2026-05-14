import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

function toOptionalBoolean(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (s === '0' || s === 'false' || s === 'no') return false;
  if (s === '1' || s === 'true' || s === 'yes') return true;
  return undefined;
}

/** GET /feed-items：列表包含 llmStatus=done | skipped 的条目（与簇内详情一致）。 */
export class ListFeedItemsQueryDto {
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
  pageSize = 30;

  @IsOptional()
  @IsMongoId()
  sourceId?: string;

  /** all：时间序；featured：仅多信源相似簇，列表按时间与全部一致 */
  @IsOptional()
  @IsIn(['all', 'featured'])
  mode?: 'all' | 'featured';

  /** 仅展示 publishedAt 落在窗口内的条目。24=最近24小时，72=3天，168=7天。 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([24, 72, 168])
  recentHours?: number;

  /**
   * 全站列表是否按相似簇合并为一行（默认 true）。为 false 时每条 RSS 一行。
   * 筛选单信源时不走合并。
   */
  @IsOptional()
  @Transform(({ value }) => {
    const b = toOptionalBoolean(value);
    return b === undefined ? true : b;
  })
  @IsBoolean()
  groupByCluster = true;
}
