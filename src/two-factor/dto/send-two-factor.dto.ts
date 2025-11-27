import { IsEmail } from 'class-validator';

export class SendTwoFactorDTO {
  @IsEmail()
  email: string;
}
