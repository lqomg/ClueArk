import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMonitorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;
}
