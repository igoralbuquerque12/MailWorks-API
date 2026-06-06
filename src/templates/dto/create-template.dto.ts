import { IsString, MinLength } from 'class-validator';

export class CreateTemplateDTO {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  html!: string;
}
