import { Module } from '@nestjs/common';
import { EMAIL_QUEUE_PUBLISHER } from './email-queue.publisher.interface';
import { SqsEmailQueuePublisher } from './sqs-email-queue.publisher';

@Module({
  providers: [
    SqsEmailQueuePublisher,
    {
      provide: EMAIL_QUEUE_PUBLISHER,
      useExisting: SqsEmailQueuePublisher,
    },
  ],
  exports: [EMAIL_QUEUE_PUBLISHER, SqsEmailQueuePublisher],
})
export class AwsModule {}
