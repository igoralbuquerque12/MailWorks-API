import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './common/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { ProvidersModule } from './providers/providers.module';
import { TemplatesModule } from './templates/templates.module';
import { EmailJobsModule } from './email-jobs/email-jobs.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    ProvidersModule,
    TemplatesModule,
    CampaignsModule,
    EmailJobsModule,
    EmailModule,
    TwoFactorModule,
    TenantsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
