import { ProviderType } from '@prisma/client';
import { IsEnum, IsObject } from 'class-validator';

export class CreateEmailProviderDTO {
  @IsEnum(ProviderType)
  providerType!: ProviderType;

  @IsObject()
  config!: Record<string, unknown>;
}
