import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { QueueModule } from 'src/queue/queue.module';
import { EmailJobModule } from 'src/email-job/email-job.module';

@Module({
  imports:     [QueueModule, EmailJobModule],
  controllers: [EmailController],
  providers:   [EmailService],
  exports:     [EmailService],
})
export class EmailModule {}
