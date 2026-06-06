import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignsService } from 'src/campaigns/campaigns.service';
import { EmailJobsService } from 'src/email-jobs/email-jobs.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailProviderFactory } from 'src/providers/email-provider.factory';

export interface ProcessEmailJobInput {
  jobId: string;
  correlationId?: string;
  receiveCount?: number;
}

@Injectable()
export class EmailWorkerService {
  private readonly logger = new Logger(EmailWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailJobsService: EmailJobsService,
    private readonly factory: EmailProviderFactory,
    private readonly configService: ConfigService,
    private readonly campaignsService: CampaignsService,
  ) {}

  /**
   * Idempotently processes one at-least-once SQS email delivery message.
   */
  async processJob(input: ProcessEmailJobInput): Promise<void> {
    const startedAt = Date.now();
    const emailJob = await this.emailJobsService.findById(input.jobId);
    if (!emailJob) throw new Error(`EmailJob ${input.jobId} not found`);

    if (emailJob.status === 'SENT') {
      this.logger.log(
        JSON.stringify({ event: 'email_job_already_sent', jobId: input.jobId }),
      );
      if (emailJob.campaignId) {
        await this.campaignsService.refreshCampaignStatus(emailJob.campaignId);
      }
      return;
    }

    await this.emailJobsService.markAsProcessing(input.jobId);
    this.logger.log(
      JSON.stringify({
        event: 'email_job_processing_started',
        jobId: input.jobId,
        tenantId: emailJob.tenantId,
        receiveCount: input.receiveCount ?? 1,
      }),
    );

    try {
      const providerConfig = await this.prisma.tenantEmailProvider.findFirst({
        where: {
          id: emailJob.providerId,
          tenantId: emailJob.tenantId,
          isActive: true,
        },
      });
      if (!providerConfig) {
        throw new Error(`Active provider ${emailJob.providerId} not found`);
      }

      const provider = this.factory.create(providerConfig);
      const result = await provider.send({
        to: emailJob.to,
        subject: emailJob.subject,
        content: emailJob.content,
      });
      await this.emailJobsService.markAsSent(input.jobId, result.messageId);
      this.logger.log(
        JSON.stringify({
          event: 'email_job_sent',
          jobId: input.jobId,
          tenantId: emailJob.tenantId,
          providerType: providerConfig.providerType,
          messageId: result.messageId,
          durationMs: Date.now() - startedAt,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const maxReceiveCount = this.configService.get<number>(
        'EMAIL_WORKER_MAX_RECEIVE_COUNT',
        5,
      );
      const finalAttempt = (input.receiveCount ?? 1) >= maxReceiveCount;
      await this.emailJobsService.markAsFailed(
        input.jobId,
        errorMessage,
        finalAttempt,
      );
      this.logger.error(
        JSON.stringify({
          event: 'email_job_failed',
          jobId: input.jobId,
          receiveCount: input.receiveCount ?? 1,
          finalAttempt,
          errorMessage,
        }),
      );
      throw error;
    } finally {
      if (emailJob.campaignId) {
        await this.campaignsService.refreshCampaignStatus(emailJob.campaignId);
      }
    }
  }
}
