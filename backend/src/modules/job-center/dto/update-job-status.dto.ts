import { IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { JOB_STATUSES } from '../job.types';

export class UpdateJobStatusDto {
  @IsIn([...JOB_STATUSES])
  status: (typeof JOB_STATUSES)[number];

  @IsOptional()
  @IsObject()
  resultSummary?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  errorMessage?: string;

  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @IsOptional()
  @IsNumber()
  attempts?: number;
}
