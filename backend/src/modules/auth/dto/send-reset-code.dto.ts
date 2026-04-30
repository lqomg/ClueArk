import { IsEmail } from 'class-validator';

export class SendResetCodeDto {
  @IsEmail()
  email: string;
}
