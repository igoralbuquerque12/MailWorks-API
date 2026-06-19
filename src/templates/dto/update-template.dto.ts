import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTemplateDTO {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  html?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
