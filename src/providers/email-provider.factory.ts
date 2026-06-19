import { Injectable } from '@nestjs/common';
import { TenantEmailProvider } from '@prisma/client';
import { ProviderType } from 'src/common/enums/provider-type.enum';
import { IEmailProvider } from 'src/common/interfaces/email-provider.interface';
import { SesConfig } from './ses/ses-config.interface';
import { SesProvider } from './ses/ses.provider';
import { SmtpConfig } from './smtp/smtp-config.interface';
import { SmtpProvider } from './smtp/smtp.provider';

@Injectable()
export class EmailProviderFactory {
  /**
   * Validates persisted provider configuration and creates its adapter.
   */
  create(providerConfig: TenantEmailProvider): IEmailProvider {
    switch (providerConfig.providerType as ProviderType) {
      case ProviderType.SMTP: {
        const config = providerConfig.config as unknown as SmtpConfig;
        if (!config.host || !config.port || !config.user || !config.pass) {
          throw new Error('Invalid SMTP provider configuration');
        }
        return new SmtpProvider(config);
      }
      case ProviderType.SES: {
        const config = providerConfig.config as unknown as SesConfig;
        if (!config.region || !config.fromEmail) {
          throw new Error('Invalid SES provider configuration');
        }
        return new SesProvider(config);
      }
      default:
        throw new Error(
          `Provider ${providerConfig.providerType} not implemented`,
        );
    }
  }
}
