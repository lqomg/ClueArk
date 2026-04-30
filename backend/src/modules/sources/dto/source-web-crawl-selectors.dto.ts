import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SourceWebCrawlSelectorsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  item!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  link!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  date?: string;
}

export class SourceWebCrawlSelectorsPatchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  item?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  link?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  date?: string;
}
