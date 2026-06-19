import { ConfigService } from '@nestjs/config';
import { ProviderType } from 'src/common/enums/provider-type.enum';
import { hashApiKey } from 'src/common/utils/api-key.util';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorService', () => {
  const prisma = {
    twoFactorChallenge: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const emailService = { send: jest.fn() };
  const config = { get: jest.fn((_key, fallback) => fallback) };
  const service = new TwoFactorService(
    prisma as never,
    emailService as never,
    config as unknown as ConfigService,
  );
  const auth = {
    tenantId: 'tenant-1',
    apiKeyId: 'key-1',
    providerId: 'provider-1',
    providerType: ProviderType.SES,
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates a hashed challenge and queues its email', async () => {
    prisma.twoFactorChallenge.create.mockResolvedValue({ id: 'challenge-1' });
    emailService.send.mockResolvedValue({ jobId: 'job-1' });
    await expect(
      service.send(auth, { email: 'customer@example.com' }),
    ).resolves.toEqual({
      challengeId: 'challenge-1',
      jobId: 'job-1',
      queued: true,
    });
    expect(prisma.twoFactorChallenge.create).toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalled();
  });

  it('accepts a correct active challenge once', async () => {
    prisma.twoFactorChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      codeHash: hashApiKey('123456'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.twoFactorChallenge.update.mockResolvedValue(undefined);
    await expect(
      service.verify(auth, {
        email: 'customer@example.com',
        code: '123456',
      }),
    ).resolves.toEqual({ valid: true });
    expect(prisma.twoFactorChallenge.update).toHaveBeenCalled();
  });

  it.each([
    ['expired', '123456', new Date(Date.now() - 60_000)],
    ['incorrect', '999999', new Date(Date.now() + 60_000)],
  ])('rejects an %s challenge', async (_case, code, expiresAt) => {
    prisma.twoFactorChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      codeHash: hashApiKey('123456'),
      expiresAt,
    });
    await expect(
      service.verify(auth, { email: 'customer@example.com', code }),
    ).resolves.toEqual({ valid: false });
  });

  it('rejects a consumed or missing challenge', async () => {
    prisma.twoFactorChallenge.findFirst.mockResolvedValue(null);
    await expect(
      service.verify(auth, {
        email: 'customer@example.com',
        code: '123456',
      }),
    ).resolves.toEqual({ valid: false });
  });
});
