import { IsEmail, IsObject, IsString } from 'class-validator';

export class SendTemplateEmailDTO {
  @IsEmail()
  to!: string;

  @IsString()
  templateId!: string;

  @IsObject()
  variables!: Record<string, string>;
}
