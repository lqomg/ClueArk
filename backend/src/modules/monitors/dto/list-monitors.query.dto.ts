import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListMonitorsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(24)
  @Max(2160)
  /** 与情报/时间线一致的聚合时间窗（小时），默认由服务配置决定 */
  recentHours?: number;
}
