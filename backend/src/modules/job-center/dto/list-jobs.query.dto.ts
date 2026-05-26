import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JOB_STATUSES, JOB_TYPES } from '../job.types';

export class ListJobsQueryDto {
  @IsOptional()
  @IsIn([...JOB_TYPES])
  type?: (typeof JOB_TYPES)[number];

  @IsOptional()
  @IsIn([...JOB_STATUSES])
  status?: (typeof JOB_STATUSES)[number];

  @IsOptional()
  @IsString()
  monitorId?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  feedItemId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 30;
}
