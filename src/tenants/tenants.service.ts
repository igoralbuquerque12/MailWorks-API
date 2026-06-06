import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProviderType } from '@prisma/client';
import {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
} from 'src/common/utils/api-key.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Bootstraps demo resources and reveals the raw API key exactly once. */
  async bootstrapDev() {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Dev bootstrap is disabled in production');
    }

    const providerType = this.configService.get<ProviderType>(
      'DEV_PROVIDER_TYPE',
      ProviderType.SES,
    );
    const rawApiKey = generateApiKey('mw_dev');
    const providerConfig =
      providerType === ProviderType.SMTP
        ? {
            host: this.configService.get<string>(
              'SMTP_HOST',
              'smtp.example.com',
            ),
            port: this.configService.get<number>('SMTP_PORT', 587),
            secure: this.configService.get<boolean>('SMTP_SECURE', false),
            user: this.configService.get<string>(
              'SMTP_USER',
              'user@example.com',
            ),
            pass: this.configService.get<string>('SMTP_PASS', 'app-password'),
            fromName: 'MailWorks Dev',
          }
        : {
            region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
            fromEmail: this.configService.get<string>(
              'AWS_SES_FROM_EMAIL',
              'verified@example.com',
            ),
            fromName: this.configService.get<string>(
              'AWS_SES_FROM_NAME',
              'MailWorks',
            ),
          };

    const tenant = await this.prisma.tenant.create({
      data: {
        name: this.configService.get<string>('DEV_TENANT_NAME', 'Dev Tenant'),
        emailProviders: {
          create: {
            providerType,
            config: providerConfig as Prisma.InputJsonValue,
          },
        },
        templates: {
          create: {
            name: 'welcome',
            subject: 'Bem-vindo, {{name}}',
            html: '<p>Ola {{name}}, bem-vindo ao MailWorks.</p>',
          },
        },
      },
      include: { emailProviders: true, templates: true },
    });
    const provider = tenant.emailProviders[0];
    const apiKey = await this.prisma.tenantApiKey.create({
      data: {
        tenantId: tenant.id,
        providerId: provider.id,
        name: this.configService.get<string>(
          'DEV_API_KEY_NAME',
          'Local Dev Key',
        ),
        keyPrefix: getApiKeyPrefix(rawApiKey),
        keyHash: hashApiKey(rawApiKey),
      },
    });

    this.logger.log(
      JSON.stringify({
        event: 'dev_tenant_bootstrapped',
        tenantId: tenant.id,
        providerId: provider.id,
        apiKeyId: apiKey.id,
      }),
    );

    return {
      tenantId: tenant.id,
      providerId: provider.id,
      templateId: tenant.templates[0].id,
      apiKey: rawApiKey,
    };
  }
}
