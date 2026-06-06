import { Injectable } from '@nestjs/common';
import { EmailJob, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmailJobsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persists a pending email job before it is published to SQS. */
  create(data: Prisma.EmailJobUncheckedCreateInput): Promise<EmailJob> {
    return this.prisma.emailJob.create({ data });
  }

  /** Finds a job for worker processing without a tenant HTTP context. */
  findById(id: string): Promise<EmailJob | null> {
    return this.prisma.emailJob.findUnique({ where: { id } });
  }

  /** Finds a job only when it belongs to the authenticated tenant. */
  findForTenant(id: string, tenantId: string): Promise<EmailJob | null> {
    return this.prisma.emailJob.findFirst({ where: { id, tenantId } });
  }

  /** Marks a delivery attempt as processing and increments its audit counter. */
  markAsProcessing(id: string): Promise<EmailJob> {
    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        errorMessage: null,
      },
    });
  }

  /** Records a successful provider delivery. */
  markAsSent(id: string, messageId?: string): Promise<EmailJob> {
    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status: 'SENT',
        messageId,
        errorMessage: null,
        processedAt: new Date(),
      },
    });
  }

  /** Records a retryable or final provider delivery failure. */
  markAsFailed(
    id: string,
    errorMessage: string,
    finalAttempt: boolean,
  ): Promise<EmailJob> {
    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status: finalAttempt ? 'FAILED_FINAL' : 'FAILED',
        errorMessage,
        processedAt: finalAttempt ? new Date() : null,
      },
    });
  }
}
