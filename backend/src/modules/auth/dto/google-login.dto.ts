import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @MinLength(100)
  @MaxLength(8192)
  idToken: string;
}
