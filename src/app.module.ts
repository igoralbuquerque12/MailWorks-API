import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailModule } from './email/email.module';
import { TwoFactorModule } from './two-factor/two-factor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EmailModule,
    TwoFactorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
