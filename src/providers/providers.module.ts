import { Module } from '@nestjs/common';
import { EmailProviderFactory } from './email-provider.factory';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  controllers: [ProvidersController],
  providers: [EmailProviderFactory, ProvidersService],
  exports: [EmailProviderFactory, ProvidersService],
})
export class ProvidersModule {}
