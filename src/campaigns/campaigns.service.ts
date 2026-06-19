import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, EmailCampaign, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Creates the campaign aggregate used to track bulk delivery. */
  async create(
    data: Prisma.EmailCampaignUncheckedCreateInput,
  ): Promise<EmailCampaign> {
    const campaign = await this.prisma.emailCampaign.create({ data });
    this.logger.log(
      JSON.stringify({
        event: 'campaign_created',
        campaignId: campaign.id,
        tenantId: campaign.tenantId,
        totalRecipients: campaign.totalRecipients,
      }),
    );
    return campaign;
  }

  /** Returns a tenant-scoped campaign and a status summary of its jobs. */
  async findForTenant(id: string, tenantId: string) {
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id, tenantId },
      include: { jobs: { select: { status: true } } },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const summary = campaign.jobs.reduce(
      (result, job) => {
        if (job.status === 'PENDING') result.pending += 1;
        if (job.status === 'PROCESSING') result.processing += 1;
        if (job.status === 'SENT') result.sent += 1;
        if (job.status === 'FAILED' || job.status === 'FAILED_FINAL') {
          result.failed += 1;
        }
        return result;
      },
      { pending: 0, processing: 0, sent: 0, failed: 0 },
    );

    return {
      campaignId: campaign.id,
      status: campaign.status,
      totalRecipients: campaign.totalRecipients,
      summary,
    };
  }

  /** Recomputes campaign status after each job processing attempt. */
  async refreshCampaignStatus(campaignId: string): Promise<void> {
    const jobs = await this.prisma.emailJob.findMany({
      where: { campaignId },
      select: { status: true },
    });
    if (jobs.length === 0) return;

    const hasOpen = jobs.some(
      (job) => job.status === 'PENDING' || job.status === 'PROCESSING',
    );
    const sent = jobs.filter((job) => job.status === 'SENT').length;
    const failed = jobs.filter(
      (job) => job.status === 'FAILED' || job.status === 'FAILED_FINAL',
    ).length;

    let status: CampaignStatus;
    if (hasOpen) status = CampaignStatus.PROCESSING;
    else if (sent === jobs.length) status = CampaignStatus.COMPLETED;
    else if (failed === jobs.length) status = CampaignStatus.FAILED;
    else status = CampaignStatus.COMPLETED_WITH_FAILURES;

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status,
        completedAt: hasOpen ? null : new Date(),
      },
    });
  }
}
