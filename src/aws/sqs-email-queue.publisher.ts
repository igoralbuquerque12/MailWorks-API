import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailQueuePublisher,
  PublishEmailJobInput,
} from './email-queue.publisher.interface';
import { EmailJobMessage } from './sqs-message.types';

@Injectable()
export class SqsEmailQueuePublisher implements EmailQueuePublisher {
  private readonly logger = new Logger(SqsEmailQueuePublisher.name);
  private readonly client: SQSClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new SQSClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    });
  }

  /**
   * Publishes one email job to SQS without exposing AWS details to the domain.
   */
  async publishEmailJob(input: PublishEmailJobInput): Promise<void> {
    const queueUrl = this.configService.getOrThrow<string>(
      'AWS_SQS_EMAIL_QUEUE_URL',
    );
    const message: EmailJobMessage = {
      jobId: input.jobId,
      tenantId: input.tenantId,
      providerId: input.providerId,
      campaignId: input.campaignId ?? null,
      correlationId: input.correlationId ?? input.jobId,
      eventType: 'EMAIL_JOB_CREATED',
      createdAt: new Date().toISOString(),
    };

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          tenantId: { DataType: 'String', StringValue: input.tenantId },
          providerId: { DataType: 'String', StringValue: input.providerId },
          eventType: { DataType: 'String', StringValue: message.eventType },
        },
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'email_job_published_to_sqs',
        jobId: input.jobId,
        tenantId: input.tenantId,
        providerId: input.providerId,
      }),
    );
  }
}
