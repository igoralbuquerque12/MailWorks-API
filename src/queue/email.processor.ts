import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailJobService } from 'src/email-job/email-job.service';
import { EmailProviderFactory } from 'src/providers/email-provider.factory';
import { EMAIL_QUEUE } from './queue.constants';

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly prisma:          PrismaService,
    private readonly emailJobService: EmailJobService,
    private readonly factory:         EmailProviderFactory,
  ) {}

  @Process()
  async handle(job: Job<{ jobId: string }>): Promise<void> {
    const { jobId } = job.data;

    const emailJob = await this.emailJobService.findById(jobId);

    if (!emailJob) {
      this.logger.error(`EmailJob ${jobId} não encontrado`);
      return;
    }

    await this.emailJobService.markAsProcessing(jobId);

    try {
      // providerId já está no job — não precisa buscar por isActive
      const providerConfig = await this.prisma.tenantEmailProvider.findUnique({
        where: { id: emailJob.providerId },
      });

      if (!providerConfig) {
        throw new Error(`Provider ${emailJob.providerId} não encontrado`);
      }

      const provider = this.factory.create(providerConfig);

      await provider.send({
        to:      emailJob.to,
        subject: emailJob.subject,
        content: emailJob.content,
      });

      await this.emailJobService.markAsSent(jobId);

      this.logger.log(`EmailJob ${jobId} enviado com sucesso`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error(`EmailJob ${jobId} falhou: ${errorMessage}`);

      await this.emailJobService.markAsFailed(jobId, errorMessage);

      throw error;
    }
  }
}
