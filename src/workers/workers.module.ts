import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from 'src/campaigns/campaigns.module';
import { EmailJobsModule } from 'src/email-jobs/email-jobs.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProvidersModule } from 'src/providers/providers.module';
import { EmailWorkerService } from './email-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    EmailJobsModule,
    ProvidersModule,
    CampaignsModule,
  ],
  providers: [EmailWorkerService],
  exports: [EmailWorkerService],
})
export class WorkersModule {}
