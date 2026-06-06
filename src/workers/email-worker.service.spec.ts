import { EmailWorkerService } from './email-worker.service';

describe('EmailWorkerService', () => {
  const prisma = {
    tenantEmailProvider: { findFirst: jest.fn() },
  };
  const jobs = {
    findById: jest.fn(),
    markAsProcessing: jest.fn(),
    markAsSent: jest.fn(),
    markAsFailed: jest.fn(),
  };
  const provider = { send: jest.fn() };
  const factory = { create: jest.fn(() => provider) };
  const config = { get: jest.fn((_key, fallback) => fallback) };
  const campaigns = { refreshCampaignStatus: jest.fn() };
  const service = new EmailWorkerService(
    prisma as never,
    jobs as never,
    factory as never,
    config as never,
    campaigns as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jobs.markAsProcessing.mockResolvedValue(undefined);
    jobs.markAsSent.mockResolvedValue(undefined);
    jobs.markAsFailed.mockResolvedValue(undefined);
    campaigns.refreshCampaignStatus.mockResolvedValue(undefined);
  });

  it('ignores an already sent job', async () => {
    jobs.findById.mockResolvedValue({ id: 'job-1', status: 'SENT' });
    await service.processJob({ jobId: 'job-1' });
    expect(jobs.markAsProcessing).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('marks a successful provider delivery as sent', async () => {
    jobs.findById.mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      campaignId: null,
      to: 'customer@example.com',
      subject: 'Subject',
      content: 'Content',
    });
    prisma.tenantEmailProvider.findFirst.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      providerType: 'SES',
    });
    provider.send.mockResolvedValue({ messageId: 'message-1' });

    await service.processJob({ jobId: 'job-1' });
    expect(jobs.markAsSent).toHaveBeenCalledWith('job-1', 'message-1');
  });

  it('marks a provider failure and rethrows it', async () => {
    jobs.findById.mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      campaignId: null,
      to: 'customer@example.com',
      subject: 'Subject',
      content: 'Content',
    });
    prisma.tenantEmailProvider.findFirst.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      providerType: 'SES',
    });
    provider.send.mockRejectedValue(new Error('SES unavailable'));

    await expect(
      service.processJob({ jobId: 'job-1', receiveCount: 1 }),
    ).rejects.toThrow('SES unavailable');
    expect(jobs.markAsFailed).toHaveBeenCalledWith(
      'job-1',
      'SES unavailable',
      false,
    );
  });
});
