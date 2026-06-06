import { Module } from '@nestjs/common';
import { EmailJobsController } from './email-jobs.controller';
import { EmailJobsService } from './email-jobs.service';

@Module({
  controllers: [EmailJobsController],
  providers: [EmailJobsService],
  exports: [EmailJobsService],
})
export class EmailJobsModule {}
