import { IsBoolean } from 'class-validator';

export class AdminUserActiveDto {
  @IsBoolean()
  isActive: boolean;
}
