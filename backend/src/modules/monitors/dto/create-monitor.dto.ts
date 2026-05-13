import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMonitorDto {
  /** 用户输入的监控话题/方向（简短即可，由 LLM 扩写为正式描述） */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  topic!: string;
}
