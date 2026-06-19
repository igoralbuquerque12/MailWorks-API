import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class BulkTemplateRecipientDTO {
  @IsString()
  email!: string;

  @IsObject()
  variables!: Record<string, string>;
}

export class SendBulkEmailDTO {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  recipients!: Array<string | BulkTemplateRecipientDTO>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}
