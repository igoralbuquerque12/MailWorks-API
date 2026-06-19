import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import {
  EMAIL_QUEUE_PUBLISHER,
  EmailQueuePublisher,
} from 'src/aws/email-queue.publisher.interface';
import { CampaignsService } from 'src/campaigns/campaigns.service';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { renderTemplate } from 'src/common/utils/template-renderer.util';
import { EmailJobsService } from 'src/email-jobs/email-jobs.service';
import { TemplatesService } from 'src/templates/templates.service';
import {
  BulkTemplateRecipientDTO,
  SendBulkEmailDTO,
} from './dto/send-bulk-email.dto';
import { SendEmailDTO } from './dto/send-email.dto';
import { SendTemplateEmailDTO } from './dto/send-template-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly emailJobsService: EmailJobsService,
    private readonly templatesService: TemplatesService,
    private readonly campaignsService: CampaignsService,
    @Inject(EMAIL_QUEUE_PUBLISHER)
    private readonly emailQueuePublisher: EmailQueuePublisher,
  ) {}

  /** Persists and queues one email for the authenticated tenant/provider. */
  async send(auth: AuthContext, dto: SendEmailDTO) {
    return this.createAndPublish(auth, dto);
  }

  /** Renders a tenant template and queues one email. */
  async sendTemplate(auth: AuthContext, dto: SendTemplateEmailDTO) {
    const template = await this.templatesService.findOne(
      auth.tenantId,
      dto.templateId,
    );
    if (!template.isActive) {
      throw new BadRequestException('Template is inactive');
    }

    return this.createAndPublish(auth, {
      to: dto.to,
      subject: renderTemplate(template.subject, dto.variables),
      content: renderTemplate(template.html, dto.variables),
    });
  }

  /**
   * Creates a campaign, persists one job per recipient, and publishes each job.
   */
  async sendBulk(auth: AuthContext, dto: SendBulkEmailDTO) {
    const recipients = this.normalizeRecipients(dto.recipients);
    let template: Awaited<ReturnType<TemplatesService['findOne']>> | undefined;

    if (dto.templateId) {
      template = await this.templatesService.findOne(
        auth.tenantId,
        dto.templateId,
      );
      if (!template.isActive) {
        throw new BadRequestException('Template is inactive');
      }
    } else if (!dto.subject || !dto.content) {
      throw new BadRequestException(
        'subject and content are required without templateId',
      );
    }

    const campaign = await this.campaignsService.create({
      tenantId: auth.tenantId,
      name: dto.name,
      subject: template?.subject ?? dto.subject!,
      totalRecipients: recipients.length,
    });

    for (const recipient of recipients) {
      const subject = template
        ? renderTemplate(template.subject, recipient.variables)
        : dto.subject!;
      const content = template
        ? renderTemplate(template.html, recipient.variables)
        : dto.content!;
      await this.createAndPublish(
        auth,
        { to: recipient.email, subject, content },
        campaign.id,
      );
    }

    this.logger.log(
      JSON.stringify({
        event: 'bulk_email_jobs_queued',
        tenantId: auth.tenantId,
        campaignId: campaign.id,
        total: recipients.length,
      }),
    );

    return {
      campaignId: campaign.id,
      queued: recipients.length,
      status: campaign.status,
    };
  }

  private async createAndPublish(
    auth: AuthContext,
    dto: SendEmailDTO,
    campaignId?: string,
  ) {
    const emailJob = await this.emailJobsService.create({
      tenantId: auth.tenantId,
      providerId: auth.providerId,
      campaignId,
      to: dto.to,
      subject: dto.subject,
      content: dto.content,
    });

    this.logger.log(
      JSON.stringify({
        event: 'email_job_created',
        jobId: emailJob.id,
        tenantId: auth.tenantId,
        providerId: auth.providerId,
        campaignId: campaignId ?? null,
      }),
    );

    await this.emailQueuePublisher.publishEmailJob({
      jobId: emailJob.id,
      tenantId: auth.tenantId,
      providerId: auth.providerId,
      campaignId,
    });

    return { jobId: emailJob.id, status: emailJob.status, queued: true };
  }

  private normalizeRecipients(
    recipients: Array<string | BulkTemplateRecipientDTO>,
  ): Array<{ email: string; variables: Record<string, string> }> {
    return recipients.map((recipient) => {
      if (typeof recipient === 'string') {
        if (!isEmail(recipient)) {
          throw new BadRequestException(`Invalid recipient: ${recipient}`);
        }
        return { email: recipient, variables: {} };
      }
      if (!recipient || !isEmail(recipient.email)) {
        throw new BadRequestException('Invalid bulk template recipient');
      }
      return { email: recipient.email, variables: recipient.variables ?? {} };
    });
  }
}
