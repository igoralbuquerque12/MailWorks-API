import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { CacheModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';
import { CodeGeneratorHelper } from './helpers/code-generator.helper';

@Module({
  imports: [CacheModule, EmailModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, CodeGeneratorHelper],
  exports: [],
})
export class TwoFactorModule {}
