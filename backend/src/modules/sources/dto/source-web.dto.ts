import { IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SourceWebCrawlSelectorsDto } from './source-web-crawl-selectors.dto';

export class SourceWebDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  crawlListUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceWebCrawlSelectorsDto)
  crawlSelectors?: SourceWebCrawlSelectorsDto;
}
