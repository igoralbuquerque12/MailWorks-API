import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { CacheModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [CacheModule, EmailModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  exports: [],
})
export class TwoFactorModule {}
