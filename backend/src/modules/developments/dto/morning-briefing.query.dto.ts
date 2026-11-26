import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** recentHours 仅兼容旧客户端；服务端忽略，窗口固定为当地日历日 */
export const MORNING_BRIEFING_RECENT_HOURS_DEFAULT = 24;
export const MORNING_BRIEFING_RECENT_HOURS_MAX = 2160;
export const MORNING_BRIEFING_RECENT_HOURS_MIN = 1;

export class MorningBriefingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MORNING_BRIEFING_RECENT_HOURS_MIN)
  @Max(MORNING_BRIEFING_RECENT_HOURS_MAX)
  recentHours?: number = MORNING_BRIEFING_RECENT_HOURS_DEFAULT;
}
