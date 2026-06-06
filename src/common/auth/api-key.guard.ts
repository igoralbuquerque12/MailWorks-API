import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { hashApiKey } from 'src/common/utils/api-key.util';
import { AuthContext } from './auth-context.interface';
import { ProviderType } from 'src/common/enums/provider-type.enum';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authenticates a tenant API key and attaches its tenant/provider context.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      auth?: AuthContext;
    }>();
    const header = request.headers['x-api-key'];
    const apiKey = Array.isArray(header) ? header[0] : header;

    if (!apiKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    const tenantApiKey = await this.prisma.tenantApiKey.findUnique({
      where: { keyHash: hashApiKey(apiKey) },
      include: { tenant: true, provider: true },
    });

    if (
      !tenantApiKey ||
      !tenantApiKey.isActive ||
      !tenantApiKey.tenant.isActive ||
      !tenantApiKey.provider.isActive ||
      tenantApiKey.provider.tenantId !== tenantApiKey.tenantId
    ) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    request.auth = {
      tenantId: tenantApiKey.tenantId,
      apiKeyId: tenantApiKey.id,
      providerId: tenantApiKey.providerId,
      providerType: tenantApiKey.provider.providerType as ProviderType,
    };

    return true;
  }
}
