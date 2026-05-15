import { Equals, IsBoolean, IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'invalid_code' })
  code: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  confirmPassword: string;

  @IsBoolean()
  @Equals(true, { message: 'must_accept_terms' })
  acceptTerms: boolean;
}
