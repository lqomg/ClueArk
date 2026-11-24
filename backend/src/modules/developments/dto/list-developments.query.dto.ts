import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListDevelopmentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 90)
  recentHours?: number;

  /** timeline：事态开始；updated：最近实质更新 */
  @IsOptional()
  @IsIn(['timeline', 'updated'])
  sort?: 'timeline' | 'updated' = 'timeline';
}
