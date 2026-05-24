import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ADMIN_CREATABLE_ROLE_VALUES, type AdminCreatableRole } from '../../users/user-role';

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsIn([...ADMIN_CREATABLE_ROLE_VALUES])
  role: AdminCreatableRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username?: string;
}
