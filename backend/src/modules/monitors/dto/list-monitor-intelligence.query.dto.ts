import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListMonitorIntelligenceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(24)
  @Max(2160)
  /** 聚合时间窗（小时），与 feed 打分候选一致，默认 720 */
  recentHours?: number;
}
