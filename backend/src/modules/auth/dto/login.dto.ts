import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  // 仅支持邮箱登录
  @IsEmail()
  @MaxLength(320)
  account: string;

  @IsString()
  @MinLength(6)
  password: string;
}
