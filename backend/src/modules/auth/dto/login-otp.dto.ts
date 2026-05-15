import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class LoginOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'invalid_code' })
  code: string;
}
