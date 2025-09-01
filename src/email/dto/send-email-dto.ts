import { IsEmail, IsString } from 'class-validator';

export class SendEmailDTO {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  content: string;
}
