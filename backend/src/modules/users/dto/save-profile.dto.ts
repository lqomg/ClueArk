import { IsString, MaxLength, MinLength } from 'class-validator';

export class SaveProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  timeZone: string;
}
