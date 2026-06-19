import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [EmailModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
})
export class TwoFactorModule {}
