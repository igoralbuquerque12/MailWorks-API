import { Injectable } from '@nestjs/common';
import { TenantEmailProvider } from '@prisma/client';
import { IEmailProvider } from 'src/common/interfaces/email-provider.interface';
import { ProviderType } from 'src/common/enums/provider-type.enum';
import { SmtpProvider, SmtpConfig } from './smtp/smtp.provider';

@Injectable()
export class EmailProviderFactory {
  create(providerConfig: TenantEmailProvider): IEmailProvider {
    switch (providerConfig.providerType as ProviderType) {
      case ProviderType.SMTP:
        return new SmtpProvider(
          providerConfig.config as unknown as SmtpConfig,
        );
      default:
        throw new Error(
          `Provider ${providerConfig.providerType} not implemented`,
        );
    }
  }
}
