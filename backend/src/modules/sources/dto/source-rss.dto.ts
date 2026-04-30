import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SourceRssDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  feedUrl: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  siteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleHint?: string;
}
