import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { TwoFactorModule } from './two-factor/two-factor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    EmailModule,
    TwoFactorModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
