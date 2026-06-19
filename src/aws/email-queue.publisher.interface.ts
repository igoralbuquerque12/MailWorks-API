export const EMAIL_QUEUE_PUBLISHER = 'EmailQueuePublisher';

export interface PublishEmailJobInput {
  jobId: string;
  tenantId: string;
  providerId: string;
  campaignId?: string | null;
  correlationId?: string;
}

export interface EmailQueuePublisher {
  /**
   * Publishes a durable request for asynchronous email delivery.
   */
  publishEmailJob(input: PublishEmailJobInput): Promise<void>;
}
