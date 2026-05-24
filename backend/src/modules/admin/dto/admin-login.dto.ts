import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  account: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
