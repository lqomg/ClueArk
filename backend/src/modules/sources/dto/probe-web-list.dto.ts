import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class ProbeWebListDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  url!: string;

  /** 可选：用已有选择器只做抽取验收，不调 LLM */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  item?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  date?: string;
}
