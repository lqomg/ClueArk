import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SOURCE_KINDS, type SourceKind } from '../source-kind';
import { SourceWebDto } from './source-web.dto';
import { SourceRssDto } from './source-rss.dto';
import { SourceHotApiDto } from './source-hot-api.dto';

export class CreateSourceDto {
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
}
