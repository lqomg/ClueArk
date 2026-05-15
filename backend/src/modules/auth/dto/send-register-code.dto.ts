import { IsEmail } from 'class-validator';

export class SendRegisterCodeDto {
  @IsEmail()
  email: string;
}
