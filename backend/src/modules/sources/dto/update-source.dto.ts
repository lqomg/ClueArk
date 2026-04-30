import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SourceWebCrawlSelectorsPatchDto } from './source-web-crawl-selectors.dto';
import { SourceHotApiPatchDto } from './source-hot-api-patch.dto';

export class SourceWebPatchDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  crawlListUrl?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @ValidateNested()
  @Type(() => SourceWebCrawlSelectorsPatchDto)
  crawlSelectors?: SourceWebCrawlSelectorsPatchDto | null;
}

export class SourceRssPatchDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  feedUrl?: string;

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

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceWebPatchDto)
  web?: SourceWebPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceRssPatchDto)
  rss?: SourceRssPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceHotApiPatchDto)
  hot?: SourceHotApiPatchDto;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
