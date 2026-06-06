import { ProviderType } from 'src/common/enums/provider-type.enum';
import { EmailService } from './email.service';

describe('EmailService', () => {
  it('creates and publishes a pending email job', async () => {
    const emailJobsService = {
      create: jest.fn().mockResolvedValue({ id: 'job-1', status: 'PENDING' }),
    };
    const publisher = {
      publishEmailJob: jest.fn().mockResolvedValue(undefined),
    };
    const service = new EmailService(
      emailJobsService as never,
      {} as never,
      {} as never,
      publisher,
    );
    const auth = {
      tenantId: 'tenant-1',
      apiKeyId: 'key-1',
      providerId: 'provider-1',
      providerType: ProviderType.SES,
    };

    await expect(
      service.send(auth, {
        to: 'customer@example.com',
        subject: 'Subject',
        content: '<p>Content</p>',
      }),
    ).resolves.toEqual({ jobId: 'job-1', status: 'PENDING', queued: true });
    expect(emailJobsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        providerId: 'provider-1',
      }),
    );
    expect(publisher.publishEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', tenantId: 'tenant-1' }),
    );
  });
});
