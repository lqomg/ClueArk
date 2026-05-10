import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { USER_ROLE_VALUES, type UserRole } from '../../users/user-role';

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsIn([...USER_ROLE_VALUES])
  role: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username?: string;
}
