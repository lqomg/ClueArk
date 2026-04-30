import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SelectorProfileDto {
  @IsString()
  @MinLength(1)
  item!: string;

  @IsString()
  @MinLength(1)
  link!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  date?: string;
}

export class CrawlRunDto {
  @IsMongoId()
  sourceId!: string;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  listUrl!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectorProfileDto)
  selectors?: SelectorProfileDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  maxItems?: number;
}
