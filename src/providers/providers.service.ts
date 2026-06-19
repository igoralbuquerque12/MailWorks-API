import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType, TenantEmailProvider } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmailProviderDTO } from './dto/create-email-provider.dto';

export interface SafeEmailProvider extends Omit<TenantEmailProvider, 'config'> {
  config: Record<string, unknown>;
}

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a provider configuration owned by the authenticated tenant. */
  create(
    tenantId: string,
    dto: CreateEmailProviderDTO,
  ): Promise<SafeEmailProvider> {
    if (
      dto.providerType !== ProviderType.SMTP &&
      dto.providerType !== ProviderType.SES
    ) {
      throw new BadRequestException('Only SMTP and SES are implemented');
    }
    return this.prisma.tenantEmailProvider
      .create({
        data: {
          tenantId,
          providerType: dto.providerType,
          config: dto.config as Prisma.InputJsonValue,
        },
      })
      .then((provider) => this.sanitize(provider));
  }

  /** Lists provider metadata without exposing stored SMTP passwords. */
  async findAll(tenantId: string): Promise<SafeEmailProvider[]> {
    const providers = await this.prisma.tenantEmailProvider.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return providers.map((provider) => this.sanitize(provider));
  }

  /** Activates or deactivates one tenant-owned provider. */
  async setActive(
    tenantId: string,
    id: string,
    isActive: boolean,
  ): Promise<SafeEmailProvider> {
    const provider = await this.prisma.tenantEmailProvider.findFirst({
      where: { id, tenantId },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    const updated = await this.prisma.tenantEmailProvider.update({
      where: { id },
      data: { isActive },
    });
    return this.sanitize(updated);
  }

  private sanitize(provider: TenantEmailProvider): SafeEmailProvider {
    const config = provider.config as Record<string, unknown>;
    return {
      ...provider,
      config:
        provider.providerType === ProviderType.SMTP
          ? { ...config, pass: '[REDACTED]' }
          : config,
    };
  }
}
