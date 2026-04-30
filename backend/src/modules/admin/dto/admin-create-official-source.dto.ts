import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SOURCE_KINDS, type SourceKind } from '../../sources/source-kind';
import { SourceWebDto } from '../../sources/dto/source-web.dto';
import { SourceRssDto } from '../../sources/dto/source-rss.dto';
import { SourceHotApiDto } from '../../sources/dto/source-hot-api.dto';

/** 管理员创建官方信源（createdBy=null） */
export class AdminCreateOfficialSourceDto {
  @IsString()
  @IsIn([...SOURCE_KINDS])
  kind: SourceKind;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceWebDto)
  web?: SourceWebDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceRssDto)
  rss?: SourceRssDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceHotApiDto)
  hot?: SourceHotApiDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
