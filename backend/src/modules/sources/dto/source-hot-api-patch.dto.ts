import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateNested } from 'class-validator';

class HotApiMapperPatchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  itemsPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  titlePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  urlPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  idPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pubDatePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  summaryPath?: string;
}

export class SourceHotApiPatchDto {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MinLength(8)
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HotApiMapperPatchDto)
  mapper?: HotApiMapperPatchDto | null;
}

