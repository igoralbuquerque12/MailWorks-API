import { IsEmail, IsString, MinLength } from 'class-validator';

export class SendEmailDTO {
  @IsEmail()
  to!: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}
