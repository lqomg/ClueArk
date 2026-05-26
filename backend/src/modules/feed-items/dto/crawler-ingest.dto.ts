import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CrawlerIngestItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  link!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  summary?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsISO8601()
  publishedAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  guid?: string;
}

export class CrawlerIngestBodyDto {
  @IsMongoId()
  sourceId!: string;

  @IsUUID()
  crawlRunId!: string;

  @IsISO8601()
  crawledAt!: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CrawlerIngestItemDto)
  items!: CrawlerIngestItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}
