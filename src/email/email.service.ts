import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailJobService } from 'src/email-job/email-job.service';
import { SendEmailDTO } from './dto/send-email-dto';
import { EMAIL_QUEUE } from 'src/queue/queue.constants';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailJobService: EmailJobService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  async send(
    apiKey: string,
    dto: SendEmailDTO,
  ): Promise<{ jobId: string; status: string }> {
    const tenantApiKey = await this.prisma.tenantApiKey.findUnique({
      where: { apiKey, isActive: true },
    });

    if (!tenantApiKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    const { tenantId, providerId } = tenantApiKey;

    // Persiste o job com provider já vinculado
    const emailJob = await this.emailJobService.create({
      tenantId,
      providerId,
      to:      dto.to,
      subject: dto.subject,
      content: dto.content,
    });

    // Enfileira para processamento assíncrono
    await this.emailQueue.add(
      { jobId: emailJob.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    this.logger.log(
      `EmailJob ${emailJob.id} enfileirado (tenant=${tenantId}, provider=${providerId})`,
    );

    return { jobId: emailJob.id, status: 'PENDING' };
  }
}
