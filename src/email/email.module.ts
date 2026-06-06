import { Module } from '@nestjs/common';
import { AwsModule } from 'src/aws/aws.module';
import { CampaignsModule } from 'src/campaigns/campaigns.module';
import { EmailJobsModule } from 'src/email-jobs/email-jobs.module';
import { TemplatesModule } from 'src/templates/templates.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [AwsModule, EmailJobsModule, TemplatesModule, CampaignsModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
