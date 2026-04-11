import { Injectable } from '@nestjs/common';
import { EmailJob } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreateEmailJobData {
  tenantId:   string;
  providerId: string;
  to:         string;
  subject:    string;
  content:    string;
}

@Injectable()
export class EmailJobService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateEmailJobData): Promise<EmailJob> {
    return this.prisma.emailJob.create({ data });
  }

  findById(id: string): Promise<EmailJob | null> {
    return this.prisma.emailJob.findUnique({ where: { id } });
  }

  markAsProcessing(id: string): Promise<EmailJob> {
    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status:   'PROCESSING',
        attempts: { increment: 1 },
      },
    });
  }

  markAsSent(id: string): Promise<EmailJob> {
    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status:      'SENT',
        processedAt: new Date(),
      },
    });
  }

  markAsFailed(id: string, errorMessage: string): Promise<EmailJob> {
    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });
  }
}
