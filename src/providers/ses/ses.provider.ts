import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  EmailPayload,
  EmailSendResult,
  IEmailProvider,
} from 'src/common/interfaces/email-provider.interface';
import { SesConfig } from './ses-config.interface';

export class SesProvider implements IEmailProvider {
  private readonly client: SESClient;

  constructor(private readonly config: SesConfig) {
    this.client = new SESClient({ region: config.region });
  }

  /**
   * Sends an HTML email through Amazon SES using the AWS credential chain.
   */
  async send(payload: EmailPayload): Promise<EmailSendResult> {
    const source = this.config.fromName
      ? `${this.config.fromName} <${this.config.fromEmail}>`
      : this.config.fromEmail;
    const response = await this.client.send(
      new SendEmailCommand({
        Source: source,
        Destination: { ToAddresses: [payload.to] },
        Message: {
          Subject: { Data: payload.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: payload.content, Charset: 'UTF-8' } },
        },
      }),
    );

    return { messageId: response.MessageId };
  }
}
