import { Equals, IsBoolean, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

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
