import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(320)
  account: string;

  @IsString()
  @MinLength(6)
  password: string;
}
