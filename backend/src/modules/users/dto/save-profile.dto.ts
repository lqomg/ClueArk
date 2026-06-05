import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { SUPPORTED_LOCALES } from '../../../common/utils/locale.utils';

export class SaveProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  timeZone: string;

  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  locale: string;
}
