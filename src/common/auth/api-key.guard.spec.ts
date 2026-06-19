import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { hashApiKey } from 'src/common/utils/api-key.util';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const findUnique = jest.fn();
  const guard = new ApiKeyGuard({
    tenantApiKey: { findUnique },
  } as unknown as PrismaService);

  function context(headers: Record<string, string> = {}) {
    const request = { headers } as {
      headers: Record<string, string>;
      auth?: unknown;
    };
    return {
      request,
      executionContext: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
    };
  }

  beforeEach(() => findUnique.mockReset());

  it('rejects a missing header', async () => {
    const { executionContext } = context();
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an invalid key', async () => {
    findUnique.mockResolvedValue(null);
    const { executionContext } = context({ 'x-api-key': 'mw_dev_invalid' });
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('hashes a valid key and attaches auth context', async () => {
    findUnique.mockResolvedValue({
      id: 'key-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      isActive: true,
      tenant: { isActive: true },
      provider: {
        id: 'provider-1',
        tenantId: 'tenant-1',
        providerType: ProviderType.SES,
        isActive: true,
      },
    });
    const { executionContext, request } = context({
      'x-api-key': 'mw_dev_valid',
    });

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { keyHash: hashApiKey('mw_dev_valid') },
      }),
    );
    expect(request.auth).toEqual({
      tenantId: 'tenant-1',
      apiKeyId: 'key-1',
      providerId: 'provider-1',
      providerType: ProviderType.SES,
    });
  });
});
